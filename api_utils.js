const pALL = require( "p-all" );
const RMU = require( "redis-manager-utils" );

const MAKE_REQUEST = require( "./generic_utils.js" ).makeRequest;
const PROMISE_ALL = require( "./generic_utils.js" ).promiseAll;
const SLEEP = require( "./generic_utils.js" ).sleep;
const GET_LARGEST_INDEX_IN_ARRAY = require( "./generic_utils.js" ).getLargestIndexInArray;

const COUNTRY_ISOS_P1 = require( "./constants.js" ).COUNTRY_ISOS_P1
const COUNTRY_ISOS_P2 = require( "./constants.js" ).COUNTRY_ISOS_P2
const COUNTRY_ISOS_P3 = require( "./constants.js" ).COUNTRY_ISOS_P3
const CHANNEL_MAP = require( "./constants.js" ).CHANNEL_MAP;

var MyRedis = null;

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
			while ( players.length > 0 ) {
				let chunk = players.splice( 0 , 500 );
				let args = chunk.map( x => [ "set" , "un:" + x , x ] );
				await MyRedis.keySetMulti( args );
				await SLEEP( 1000 );
			}
			resolve( true );
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}

function update_chess_com_usernames() {
	return new Promise( async function( resolve , reject ) {
		try {
			await PROMISE_ALL( COUNTRY_ISOS_P1 , get_usernames_in_country , 3 );
			await PROMISE_ALL( COUNTRY_ISOS_P2 , get_usernames_in_country , 3 );
			await PROMISE_ALL( COUNTRY_ISOS_P3 , get_usernames_in_country , 3 );
			resolve();
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}

function _build_patterns_from_char( wString , wChar ) {
	let patterns = [];
	let sarray = Array.from( wString );
	let slength = sarray.length;
	for ( let i = 1; i < ( slength + 1 ); ++i ) {
		let left_side = sarray.slice( 0 , ( i - 1 ) );
		left_side = left_side.join( "" );
		let right_side = sarray.slice( ( i ) , slength );
		right_side = right_side.join( "" );
		let pattern = left_side + wChar + right_side;
		patterns.push( pattern );
	}
	return patterns;
}

function try_match_username( user_name_attempt ) {
	return new Promise( async function( resolve , reject ) {
		try {
			user_name_attempt = user_name_attempt.toLowerCase();
			// let verified = await MyRedis.keyGet( "un:" + user_name_attempt );
			// console.log( verified );
			// if ( verified !== null && verified !== "null" ) { resolve( verified ); return; }

			let patterns = _build_patterns_from_char( user_name_attempt , "?" );
			let suggestions = await MyRedis.keysGetFromPattern( patterns );
			console.log( patterns );
			resolve();
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}

( async ()=> {

	// MyRedis = new RMU( 2 );
	// await MyRedis.init();
	//await update_chess_com_usernames()
	await try_match_username( "bless-rng" );

})();


// Jebaited again , last game is not updating in this json point
// html scraping pepoDance lol
// https://www.chess.com/games/archive/erichansen
// https://www.chess.com/games/archive?gameOwner=other_game&username=erichansen&gameType=recent&gameTypeall=live&gameTypeall=daily&gameResult=&opponent=&opening=&color=&gameTourTeam=&gameTitle=&timeSort=desc&rated=&startDate%5Bdate%5D=12%2F24%2F2018&endDate%5Bdate%5D=12%2F25%2F2018&fen=&ratingFrom=&ratingTo=&search=
const games_endpoint_base = "https://api.chess.com/pub/player/";
function get_users_latest_games( user_name ) {
	return new Promise( async function( resolve , reject ) {
		try {
			const today = new Date();
			const year = today.getFullYear().toString();
			let month = ( today.getMonth() + 1 );
			// So at somepoint it will matter that you can only get the month , not day from chess com
			// So like at midnight on the 1st we might not get the full list
			//let day = ( today.get )
			if ( month < 10 ) { month = "0" + month; }
			const url = games_endpoint_base + user_name + "/games/" + year + "/" + month;
			let data = await MAKE_REQUEST( url );
			if ( !data ) { resolve( false ); return; }
			data = JSON.parse( data );
			resolve( data.games.reverse() );
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}
module.exports.getUsersLatestGames = get_users_latest_games;

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



function GET_CHANNELS_LIVE_USERS( channel ) {
	return new Promise( function( resolve , reject ) {
		try {
			let wActions = CHANNEL_MAP[ channel ].map( x => async () => { let x1 = await GET_LIVE_STATUS( x ); return x1; } );
			pALL( wActions , { concurrency: 5 } ).then( result => {
				resolve( result );
			});
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}

function GET_USERS_GAMES( user_list ) {
	return new Promise( function( resolve , reject ) {
		try {
			let wActions = user_list.map( x => async () => { let x1 = await get_users_latest_games( x ); return x1; } );
			pALL( wActions , { concurrency: 5 } ).then( result => {
				resolve( result );
			});
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}

function GET_LATEST_LIVE_USER_IN_CHANNEL( channel ) {
	return new Promise( async function( resolve , reject ) {
		try {
			// Go figure its unreliable , users are streaming and it says they are offline randomly
			// let online = await PROMISE_ALL_LIVE_STATUS();
			// online = online.filter( x => x[ "status" ] !== false );
			// if ( online.length < 1 ) { resolve( false ); return; }
			// if ( online.length === 1 ) {
			// 	let latest_games = await get_users_latest_games( online[ 0 ] );
			// 	resolve( [ online[ 0 ] , latest_games ] );
			// 	return;
			// }
			//console.log( online );
			let games = await PROMISE_ALL_GAMES( CHANNEL_MAP[ channel ] );
			if ( !games ) { resolve( false ); return; }
			if ( games.length < 1 ) { resolve( false ); return; }
			let first_end_times = games.map( x => x[ 0 ][ "end_time" ] );
			//let latest_time_index = first_end_times.reduce( ( iMax , x , i , arr ) => x > arr[ iMax ] ? i : iMax , 0 );
			let latest_time_index = GET_LARGEST_INDEX_IN_ARRAY( first_end_times );
			let most_likely_username = online[ latest_time_index ][ "username" ];
			console.log( "Most Likely 'Live' User == " + most_likely_username );
			//resolve( [ most_likely_username , games[ latest_time_index ] ] );
			resolve( { username: most_likely_username , game_data: games[ latest_time_index ] } )
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}
module.exports.getLatestLiveUserInChannel = GET_LATEST_LIVE_USER_IN_CHANNEL;


function get_users_current_streak( channel , user_name ) {
	return new Promise( async function( resolve , reject ) {
		try {
			let result = { score: null , opponent: null , our_guy: null };
			let games;
			// If the !streak command didn't contain a chess.com username , attempt to find latest in channel map
			if ( !user_name ) {
				let latest_games_data = await GET_LATEST_LIVE_USER_IN_CHANNEL( channel );
				// TODO: Add expiration time , like if last game was over an hour ago , don't report
				user_name = latest_games_data.username;
				games = latest_games_data.game_data;
			}
			else {
				// Live Status Unreliable
				// let user_satus = await GET_LIVE_STATUS( user_name );
				// if ( !user_satus.status ) { resolve( false ); return; }
				games = await get_users_latest_games( user_name );
				if ( !games ) { resolve( false ); return; }
				if ( games.length < 2 ) { resolve( false ); return; }
			}
			//console.log( games );
			const last_opponent = ( games[ 0 ][ "white" ][ "username" ] === user_name ) ? games[ 0 ][ "black" ][ "username" ] : games[ 0 ][ "white" ][ "username" ];
			console.log( "Last Opponent == " + last_opponent );

			// const streak_games = games.filter( x =>
			// 	x[ "white" ][ "username" ] !== last_opponent && x[ "black" ][ "username" ] === last_opponent ||
			// 	x[ "black" ][ "username" ] !== last_opponent && x[ "white" ][ "username" ] === last_opponent
			// );

			let streak_games = [];
			for ( let i = 0; i < games.length; ++i ) {
				let white = games[ i ][ "white" ];
				let black = games[ i ][ "black" ];
				if ( white.username === last_opponent || black.username === last_opponent ) { streak_games.push( games[ i ] ); }
				else { break; }
			}
			//console.log( streak_games );
			// TODO : Add Reverse Adoption Score ?
			let streak = 0;
			for ( let i = 0; i < streak_games.length; ++i ) {
				let white = streak_games[ i ][ "white" ];
				let black = streak_games[ i ][ "black" ];
				console.log( i.toString() + " == " + white.username + " == " + white.result + " vs " + black.username + " == " + black.result );
				let our_guy = ( white.username === user_name ) ? white : black;
				if ( our_guy.result === "win" ) { streak = streak + 1; }
				else { break; }
			}
			//resolve( [ streak , last_opponent , user_name ] );
			result.score = streak;
			result.opponent = last_opponent;
			result.our_guy = user_name;
			resolve( result );
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}
module.exports.getUsersCurrentStreak = get_users_current_streak;

// function get_users_current_streak_vs_other_user( channel , user_name , other_user ) {

// }
// module.exports.getUsersCurrentStreakVSOtherUser = get_users_current_streak_vs_other_user;