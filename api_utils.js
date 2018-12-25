const request = require( "request" );
const pALL = require( "p-all" );

function MAKE_REQUEST( wURL ) {
	return new Promise( async function( resolve , reject ) {
		try {
			request( wURL , async function ( err , response , body ) {
				if ( err ) { resolve("error"); return; }
				console.log( wURL + "\n\t--> RESPONSE_CODE = " + response.statusCode.toString() );
				if ( response.statusCode !== 200 ) {
					//console.log( "bad status code ... " );
					resolve( false );
					return;
				}
				else {
					resolve( body );
					return;
				}
			});
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}

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

// Maps Twitch Username to Chess.com Usernames that stream on the channel
const CHANNEL_MAP = {
	chessbrah: [ "erichansen" , "knvb" , "chessbrah" ] ,
	gmhikaru: [ "Hikaru" ] ,
	gothamchess: [  ] ,
	alexandrabotez: [  ] ,
	manneredmonkey: [ "ekurtz" ] ,
};

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
			let latest_time_index = first_end_times.reduce( ( iMax , x , i , arr ) => x > arr[ iMax ] ? i : iMax , 0 );
			let most_likely_username = online[ latest_time_index ][ "username" ];
			console.log( "Most Likely 'Live' User == " + most_likely_username );
			//resolve( [ most_likely_username , games[ latest_time_index ] ] );
			resolve( { username: most_likely_username , game_data: games[ latest_time_index ] } )
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}


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

function get_users_current_streak_vs_other_user( channel , user_name , other_user ) {

}
module.exports.getUsersCurrentStreakVSOtherUser = get_users_current_streak_vs_other_user;