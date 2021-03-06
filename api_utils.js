const pALL = require( "p-all" );
//const RMU = require( "redis-manager-utils" );

const MAKE_REQUEST = require( "./generic_utils.js" ).makeRequest;
const PROMISE_ALL = require( "./generic_utils.js" ).promiseAll;
const SLEEP = require( "./generic_utils.js" ).sleep;
const GET_LARGEST_INDEX_IN_ARRAY = require( "./generic_utils.js" ).getLargestIndexInArray;

const COUNTRY_ISOS_P1 = require( "./constants.js" ).COUNTRY_ISOS_P1
const COUNTRY_ISOS_P2 = require( "./constants.js" ).COUNTRY_ISOS_P2
const COUNTRY_ISOS_P3 = require( "./constants.js" ).COUNTRY_ISOS_P3
const CHANNEL_MAP = require( "./constants.js" ).CHANNEL_MAP;

const MyRedis = require( "./main.js" ).redis;

const usernames_in_country_base_url = "https://api.chess.com/pub/country/";
function get_usernames_in_country( country_iso_code ) {
	return new Promise( async function( resolve , reject ) {
		try {
			let url = usernames_in_country_base_url + country_iso_code + "/players";
			let players;
			players = await MAKE_REQUEST( url );
			if ( !players ) { resolve( false ); return; }
			try { players = JSON.parse( players ); }
			catch( e ) { resolve( false ); return; }
			players = players[ "players" ];
			//console.log( players );
			const length = players.length;
			console.log( "Player Count == " + length.toString() );

			let chunks = [];
			while ( players.length > 0 ) {
				let chunk = players.splice( 0 , 500 );
				let args = chunk.map( x => [ "setnx" , "un:" + x , x ] );
				chunks.push( args );
			}
			for ( let i = 0; i < chunks.length; ++i ) {
				await MyRedis.keySetMulti( chunks[ i ] );
				await SLEEP( 1000 );
			}

			// while ( players.length > 0 ) {
			// 	let chunk = players.splice( 0 , 500 );
			// 	let args = chunk.map( x => [ "setnx" , "un:" + x , x ] );
			// 	await MyRedis.keySetMulti( args );
			// 	await SLEEP( 1000 );
			// }

			resolve( true );
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}

// Around 20 minutes
function update_chess_com_usernames() {
	return new Promise( async function( resolve , reject ) {
		try {
			console.time( "update_usernames" );
			console.time( "update_usernames_p1" );
			await PROMISE_ALL( COUNTRY_ISOS_P1 , get_usernames_in_country , 3 );
			console.timeEnd( "update_usernames_p1" );
			console.time( "update_usernames_p2" );
			await PROMISE_ALL( COUNTRY_ISOS_P2 , get_usernames_in_country , 3 );
			console.timeEnd( "update_usernames_p2" );
			console.time( "update_usernames_p3" );
			await PROMISE_ALL( COUNTRY_ISOS_P3 , get_usernames_in_country , 3 );
			console.timeEnd( "update_usernames_p3" );

			// Now We Need To Fill in Gaps ,
			// beacuse apparently "erichansen" isn't actually on the list of Canadian Players
			// https://api.chess.com/pub/country/CA/players
			// Even though , https://api.chess.com/pub/player/erichansen says that he is
			await MyRedis.keySet( "un:erichansen" , "erichansen" ); // Staff ?
			await MyRedis.keySet( "un:lethbridgechess" , "lethbridgechess" ); // On purpose ?

			console.timeEnd( "update_usernames" );
			resolve();
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}
module.exports.updateUserNames = update_chess_com_usernames;

function _build_patterns_from_char( wString , wChar ) {
	let patterns = [];
	let sarray = Array.from( wString );
	let slength = sarray.length;
	patterns.push( wChar + wString );
	patterns.push( wChar + wChar + wString );
	for ( let i = 1; i < ( slength + 1 ); ++i ) {
		let left_side = sarray.slice( 0 , ( i - 1 ) );
		left_side = left_side.join( "" );
		let right_side = sarray.slice( ( i ) , slength );
		right_side = right_side.join( "" );
		let pattern = left_side + wChar + right_side;
		//let guess = left_side + wChar + "*";
		patterns.push( pattern );
		//patterns.push( guess );
	}
	patterns.push( wString + wChar );
	patterns.push( wString + wChar + wChar );
	patterns.push( wChar + wString + wChar );
	patterns.push( wChar + wChar + wString + wChar + wChar );
	return patterns;
}

function _get_most_frequent_in_array( arr ) {
	let map = {};
	let mostFrequentElement = arr[ 0 ];
	for( let i = 0; i < arr.length; i++ ) {
		if( !map[ arr[ i ] ] ) {
			map[ arr[ i ] ] = 1;
		}
		else {
			++map[ arr[ i ] ];
			if( map[ arr[ i ] ] > map[ mostFrequentElement ] ) {
				mostFrequentElement = arr[ i ];
			}
		}
	}
	return mostFrequentElement;
}

// Returns [ username , channel ]
function _match_nickname( user_name_attempt ) {
	for ( var channel in CHANNEL_MAP ) {
		for ( let i = 0; i < CHANNEL_MAP[ channel ][ "nicknames" ].length; ++i ) {
			if ( CHANNEL_MAP[ channel ][ "nicknames" ][ i ] === user_name_attempt ) {
				return [ CHANNEL_MAP[ channel ][ "usernames" ][ 0 ].toLowerCase() , channel ];
			}
		}
	}
	return false;
}
module.exports.matchNickName = _match_nickname;

// https://redis.io/commands/keys
const profile_page_base_url = "https://www.chess.com/member/";
function try_match_username( user_name_attempt ) {
	return new Promise( async function( resolve , reject ) {
		try {

			user_name_attempt = user_name_attempt.toLowerCase();
			let result = { username: false , method: false , channel: false };

			// ( Stage - 1 ) = See if we have a matched nickname
			let matched_nickname = _match_nickname( user_name_attempt );
			if ( matched_nickname !== false ) {
				result.username = matched_nickname[ 0 ];
				result.channel = matched_nickname[ 1 ];
				result.method = "nickname";
				resolve( result );
				return;
			}

			// ( Stage - 2 ) = Check Redis DB for Username
			let verified = await MyRedis.keyGet( "un:" + user_name_attempt );
			if ( verified !== null && verified !== "null" ) {
				console.log( "Found Verified Match in Redis = " + verified );
				result.username = verified;
				result.method = "verified";
				resolve( result );
				return;
			}

			// ( Stage - 3 ) = Check for Valid Chess.com Profile Page
			let valid_chess_com_profile = await MAKE_REQUEST( profile_page_base_url + user_name_attempt );
			if ( valid_chess_com_profile ) {
				console.log( "Found Verified Chess.com Profile  = " + user_name_attempt );
				result.username = user_name_attempt;
				result.method = "verified";
				resolve( result );
				return;
			}


			// ( Stage - 4 ) = Check for Mistyped Usernames using some pattern matching 'hack'
			let patterns = _build_patterns_from_char( user_name_attempt , "?" );
			patterns.push( user_name_attempt + "*" );
			patterns.push( "*" + user_name_attempt );
			//let patterns_2 = _build_patterns_from_char( user_name_attempt , "*" );
			//let patterns = [ ...patterns_1 , ...patterns_2 ];
			patterns = patterns.map( x => "un:" + x );
			console.log( patterns );
			let suggestions = [];
			//let suggestions = await MyRedis.keysGetFromPattern( patterns );
			for ( let i = 0; i < patterns.length; ++i ) {
				let x_sugg = await MyRedis.keysGetFromPattern( patterns[ i ] );
				suggestions.push.apply( suggestions , x_sugg );
			}
			if ( !suggestions ) { resolve( false ); return; }
			if ( suggestions.length < 1 ) { resolve( false ); return; }
			suggestions = suggestions.map( x => x.split( "un:" )[ 1 ] );
			//suggestions.sort();
			console.log( suggestions );
			let most_likely_guess = _get_most_frequent_in_array( suggestions );
			console.log( "Most Likely Username is " + most_likely_guess );
			result.username = most_likely_guess;
			result.method = "best_match";
			resolve( result );

		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}
module.exports.tryMatchUserName = try_match_username;

const BASE_WHO_IS_URL = " https://api.chess.com/pub/player/";
function _get_who_is_user_name( user_name ) {
	return new Promise( async function( resolve , reject ) {
		try {
			let result = { verified: false , real_name: false };
			if ( !user_name ) { resolve( result ); return; }
			if ( user_name.length < 1 ) { resolve( result ); return; }
			let url = BASE_WHO_IS_URL + user_name;
			let data = await MAKE_REQUEST( url );
			if ( !data ) { resolve( result ); return; }
			data = JSON.parse( data );
			if ( !data ) { resolve( result ); return; }
			result.verified = true;
			if ( !data[ "name" ] ) { resolve( result ); return; }
			if ( data[ "name" ].length < 1 ) { resolve( result ); return; }
			result.real_name = data[ "name" ];
			resolve( result );
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}

function get_who_is_user_name( user_name ) {
	return new Promise( async function( resolve , reject ) {
		try {

			let matched_nickname = _match_nickname( user_name );
			if ( matched_nickname !== false ) {
				user_name = matched_nickname[ 0 ];
			}

			let result = { username: user_name , message: false , best_match: false , real_name: false };
			let user = await _get_who_is_user_name( user_name );
			console.log( user );
			if ( user.verified ) {
				if ( user.real_name ) {
					result.message = user_name + " is : " + user.real_name;
					result.real_name = user.real_name;
					resolve( result );
					return;
				}
				else {
					resolve( result );
					return;
				}
			}
			let best_match = await try_match_username( user_name );
			if ( !best_match.username ) {
				resolve( false );
				return;
			}
			user = await _get_who_is_user_name( best_match.username );
			result.best_match = best_match;
			result.message = best_match.username + " is : " + user.real_name;
			result.real_name = user.real_name;
			resolve( result );
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}
module.exports.whoIsUserName = get_who_is_user_name;

const online_status_endpoint_base = "https://api.chess.com/pub/player/";
function GET_LIVE_STATUS( user_name ) {
	return new Promise( async function( resolve , reject ) {
		try {
			let url = online_status_endpoint_base + user_name + "/is-online";
			let data = await MAKE_REQUEST( url );
			let conclusion = false;
			if ( data ) {
				data = JSON.parse( data );
				if ( data.online === true || data.online === "true" ) { conclusion = true; }
			}
			resolve( { username: user_name , status: conclusion } );
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}
module.exports.getLiveStatus = GET_LIVE_STATUS;

// Testing
// =================

// ( async ()=> {

// 	MyRedis = new RMU( 2 );
// 	await MyRedis.init();
// 	await update_chess_com_usernames()
// 	//await try_match_username( "bless" );

// })();



// Might as Well Discontinue
//=========================

// Jebaited again , last game is not updating in this json point
// html scraping pepoDance lol
// https://www.chess.com/games/archive/erichansen
// https://www.chess.com/games/archive?gameOwner=other_game&username=erichansen&gameType=recent&gameTypeall=live&gameTypeall=daily&gameResult=&opponent=&opening=&color=&gameTourTeam=&gameTitle=&timeSort=desc&rated=&startDate%5Bdate%5D=12%2F24%2F2018&endDate%5Bdate%5D=12%2F25%2F2018&fen=&ratingFrom=&ratingTo=&search=
// const games_endpoint_base = "https://api.chess.com/pub/player/";
// function get_users_latest_games( user_name ) {
// 	return new Promise( async function( resolve , reject ) {
// 		try {
// 			const today = new Date();
// 			const year = today.getFullYear().toString();
// 			let month = ( today.getMonth() + 1 );
// 			// So at somepoint it will matter that you can only get the month , not day from chess com
// 			// So like at midnight on the 1st we might not get the full list
// 			//let day = ( today.get )
// 			if ( month < 10 ) { month = "0" + month; }
// 			const url = games_endpoint_base + user_name + "/games/" + year + "/" + month;
// 			let data = await MAKE_REQUEST( url );
// 			if ( !data ) { resolve( false ); return; }
// 			data = JSON.parse( data );
// 			resolve( data.games.reverse() );
// 		}
// 		catch( error ) { console.log( error ); reject( error ); }
// 	});
// }
// module.exports.getUsersLatestGames = get_users_latest_games;


// function GET_CHANNELS_LIVE_USERS( channel ) {
// 	return new Promise( function( resolve , reject ) {
// 		try {
// 			let wActions = CHANNEL_MAP[ channel ].map( x => async () => { let x1 = await GET_LIVE_STATUS( x ); return x1; } );
// 			pALL( wActions , { concurrency: 5 } ).then( result => {
// 				resolve( result );
// 			});
// 		}
// 		catch( error ) { console.log( error ); reject( error ); }
// 	});
// }

// function GET_USERS_GAMES( user_list ) {
// 	return new Promise( function( resolve , reject ) {
// 		try {
// 			let wActions = user_list.map( x => async () => { let x1 = await get_users_latest_games( x ); return x1; } );
// 			pALL( wActions , { concurrency: 5 } ).then( result => {
// 				resolve( result );
// 			});
// 		}
// 		catch( error ) { console.log( error ); reject( error ); }
// 	});
// }

// function GET_LATEST_LIVE_USER_IN_CHANNEL( channel ) {
// 	return new Promise( async function( resolve , reject ) {
// 		try {
// 			// Go figure its unreliable , users are streaming and it says they are offline randomly
// 			// let online = await PROMISE_ALL_LIVE_STATUS();
// 			// online = online.filter( x => x[ "status" ] !== false );
// 			// if ( online.length < 1 ) { resolve( false ); return; }
// 			// if ( online.length === 1 ) {
// 			// 	let latest_games = await get_users_latest_games( online[ 0 ] );
// 			// 	resolve( [ online[ 0 ] , latest_games ] );
// 			// 	return;
// 			// }
// 			//console.log( online );
// 			let games = await PROMISE_ALL( CHANNEL_MAP[ channel ] ,  );
// 			if ( !games ) { resolve( false ); return; }
// 			if ( games.length < 1 ) { resolve( false ); return; }
// 			let first_end_times = games.map( x => x[ 0 ][ "end_time" ] );
// 			//let latest_time_index = first_end_times.reduce( ( iMax , x , i , arr ) => x > arr[ iMax ] ? i : iMax , 0 );
// 			let latest_time_index = GET_LARGEST_INDEX_IN_ARRAY( first_end_times );
// 			let most_likely_username = online[ latest_time_index ][ "username" ];
// 			console.log( "Most Likely 'Live' User == " + most_likely_username );
// 			//resolve( [ most_likely_username , games[ latest_time_index ] ] );
// 			resolve( { username: most_likely_username , game_data: games[ latest_time_index ] } )
// 		}
// 		catch( error ) { console.log( error ); reject( error ); }
// 	});
// }
// module.exports.getLatestLiveUserInChannel = GET_LATEST_LIVE_USER_IN_CHANNEL;


// function get_users_current_streak( channel , user_name ) {
// 	return new Promise( async function( resolve , reject ) {
// 		try {
// 			let result = { score: null , opponent: null , our_guy: null };
// 			let games;
// 			// If the !streak command didn't contain a chess.com username , attempt to find latest in channel map
// 			if ( !user_name ) {
// 				let latest_games_data = await GET_LATEST_LIVE_USER_IN_CHANNEL( channel );
// 				// TODO: Add expiration time , like if last game was over an hour ago , don't report
// 				user_name = latest_games_data.username;
// 				games = latest_games_data.game_data;
// 			}
// 			else {
// 				// Live Status Unreliable
// 				// let user_satus = await GET_LIVE_STATUS( user_name );
// 				// if ( !user_satus.status ) { resolve( false ); return; }
// 				games = await get_users_latest_games( user_name );
// 				if ( !games ) { resolve( false ); return; }
// 				if ( games.length < 2 ) { resolve( false ); return; }
// 			}
// 			//console.log( games );
// 			const last_opponent = ( games[ 0 ][ "white" ][ "username" ] === user_name ) ? games[ 0 ][ "black" ][ "username" ] : games[ 0 ][ "white" ][ "username" ];
// 			console.log( "Last Opponent == " + last_opponent );

// 			// const streak_games = games.filter( x =>
// 			// 	x[ "white" ][ "username" ] !== last_opponent && x[ "black" ][ "username" ] === last_opponent ||
// 			// 	x[ "black" ][ "username" ] !== last_opponent && x[ "white" ][ "username" ] === last_opponent
// 			// );

// 			let streak_games = [];
// 			for ( let i = 0; i < games.length; ++i ) {
// 				let white = games[ i ][ "white" ];
// 				let black = games[ i ][ "black" ];
// 				if ( white.username === last_opponent || black.username === last_opponent ) { streak_games.push( games[ i ] ); }
// 				else { break; }
// 			}
// 			//console.log( streak_games );
// 			// TODO : Add Reverse Adoption Score ?
// 			let streak = 0;
// 			for ( let i = 0; i < streak_games.length; ++i ) {
// 				let white = streak_games[ i ][ "white" ];
// 				let black = streak_games[ i ][ "black" ];
// 				console.log( i.toString() + " == " + white.username + " == " + white.result + " vs " + black.username + " == " + black.result );
// 				let our_guy = ( white.username === user_name ) ? white : black;
// 				if ( our_guy.result === "win" ) { streak = streak + 1; }
// 				else { break; }
// 			}
// 			//resolve( [ streak , last_opponent , user_name ] );
// 			result.score = streak;
// 			result.opponent = last_opponent;
// 			result.our_guy = user_name;
// 			resolve( result );
// 		}
// 		catch( error ) { console.log( error ); reject( error ); }
// 	});
// }
// module.exports.getUsersCurrentStreak = get_users_current_streak;

// function get_users_current_streak_vs_other_user( channel , user_name , other_user ) {

// }
// module.exports.getUsersCurrentStreakVSOtherUser = get_users_current_streak_vs_other_user;