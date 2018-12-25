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

const cbrah_order = [ "erichansen" , "knvb" , "chessbrah" , "Hikaru" , "bless-rng" ];
function PROMISE_ALL_LIVE_STATUS() {
	return new Promise( function( resolve , reject ) {
		try {
			let wActions = cbrah_order.map( x => async () => { let x1 = await GET_LIVE_STATUS( x ); return x1; } );
			pALL( wActions , { concurrency: 5 } ).then( result => {
				resolve( result );
			});
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}

function PROMISE_ALL_GAMES( live_users ) {
	return new Promise( function( resolve , reject ) {
		try {
			let wActions = live_users.map( x => async () => { let x1 = await get_users_latest_games( x[ "username" ] ); return x1; } );
			pALL( wActions , { concurrency: 5 } ).then( result => {
				resolve( result );
			});
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}

function GET_MOST_LIKELY_LIVE_CBRAH() {
	return new Promise( async function( resolve , reject ) {
		try {
			let online = await PROMISE_ALL_LIVE_STATUS();
			online = online.filter( x => x[ "status" ] !== false );
			if ( online.length < 1 ) { resolve( false ); return; }
			//if ( online.length === 1 ) { resolve( online[ 0 ][ "username" ] ); return; }
			console.log( online );
			let cbrah_games = await PROMISE_ALL_GAMES( online );
			let first_end_times = cbrah_games.map( x => x[ 0 ][ "end_time" ] );
			let games_with_latest_end_time = first_end_times.reduce( ( iMax , x , i , arr ) => x > arr[ iMax ] ? i : iMax , 0 );
			let most_likely_username = online[ games_with_latest_end_time ][ "username" ];
			console.log( "Most Likely 'Live' User == " + most_likely_username );
			resolve( [ most_likely_username , cbrah_games[ games_with_latest_end_time ] ] );
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}

function get_users_current_streak( user_name ) {
	return new Promise( async function( resolve , reject ) {
		try {
			let latest_games;
			if ( !user_name ) {
				let latest_games_data = await GET_MOST_LIKELY_LIVE_CBRAH();
				user_name = latest_games_data[ 0 ];
				latest_games = latest_games_data[ 1 ];
			}
			else {
				latest_games = await get_users_latest_games( user_name );
				if ( !latest_games ) { resolve( false ); return; }
				if ( latest_games.length < 2 ) { resolve( false ); return; }
			}

			const last_opponent = ( latest_games[ 0 ][ "white" ][ "username" ] === user_name ) ? latest_games[ 0 ][ "black" ][ "username" ] : latest_games[ 0 ][ "white" ][ "username" ];
			console.log( "Last Opponent == " + last_opponent );
			// const streak_games = latest_games.filter( x =>
			// 	x[ "white" ][ "username" ] !== last_opponent && x[ "black" ][ "username" ] === last_opponent ||
			// 	x[ "black" ][ "username" ] !== last_opponent && x[ "white" ][ "username" ] === last_opponent
			// );

			let streak_games = [];
			for ( let i = 0; i < latest_games.length; ++i ) {
				let white = latest_games[ i ][ "white" ];
				let black = latest_games[ i ][ "black" ];
				if ( white.username === last_opponent || black.username === last_opponent ) { streak_games.push( latest_games[ i ] ); }
				else { break; }
			}
			//console.log( streak_games );
			let streak = 0;
			for ( let i = 0; i < streak_games.length; ++i ) {
				let white = streak_games[ i ][ "white" ];
				let black = streak_games[ i ][ "black" ];
				console.log( i.toString() + " == " + white.username + " == " + white.result + " vs " + black.username + " == " + black.result );
				let our_guy = ( white.username === user_name ) ? white : black;
				if ( our_guy.result === "win" ) { streak = streak + 1; }
				else { break; }
			}
			resolve( [ streak , last_opponent , user_name ] );
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}
module.exports.getUsersCurrentStreak = get_users_current_streak;