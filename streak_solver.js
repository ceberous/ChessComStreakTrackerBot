const API_UTILS = require( "./api_utils.js" );
const SCRAPER_UTILS = require( "./scraper_utils.js" );

const PROMISE_ALL = require( "./generic_utils.js" ).promiseAll;
const GET_LARGEST_INDEX_IN_ARRAY = require( "./generic_utils.js" ).getLargestIndexInArray;

const CHANNEL_MAP = require( "./constants.js" ).CHANNEL_MAP;

function _compute_streak( games , user_name ) {
	const last_opponent = games[ 0 ][ 2 ];
	console.log( "Last Opponent == " + last_opponent );

	let result = { score: 0 , opponent: last_opponent , our_guy: user_name , message: "" };

	//let streak_games = [];
	for ( let i = 0; i < games.length; ++i ) {
		if ( games[ i ][ 2 ] === last_opponent ) {
			console.log( i.toString() + " == " + user_name + " == " + games[ i ][ 1 ] + " vs " + last_opponent + " == " + games[ i ][ 3 ] );
			if ( games[ i ][ 1 ] === "1" ) {
				result.score = result.score + 1;
			}
			else { break; }
		}
		else { break; }
	}
	//console.log( streak_games );
	// TODO : Add Reverse Adoption Score ?
	// let streak = 0;
	// for ( let i = 0; i < streak_games.length; ++i ) {
	// 	console.log( i.toString() + " == " + user_name + " == " + streak_games[ i ][ 1 ] + " vs " + last_opponent + " == " + black.result );
	// 	let our_guy = ( white.username === user_name ) ? white : black;
	// 	if ( our_guy.result === "win" ) { streak = streak + 1; }
	// 	else { break; }
	// }
	//resolve( [ streak , last_opponent , user_name ] );
	result.message = user_name + " vs " + last_opponent + " [" + result.score.toString() + "]";
	return result;
}

function compute_user_streak( user_name ) {
	return new Promise( async function( resolve , reject ) {
		try {
			//let games = await API_UTILS.getUsersLatestGames( user_name );
			let games = await SCRAPER_UTILS.getUsersLatestGames( user_name );
			let result = _compute_streak( games , user_name );
			resolve( result );
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}
module.exports.getUserStreak = compute_user_streak;


function compute_twitch_channel_streak( channel ) {
	return new Promise( async function( resolve , reject ) {
		try {
			if ( !CHANNEL_MAP[ channel ] ) { resolve( false ); return; }
			let games = await PROMISE_ALL( CHANNEL_MAP[ channel ] , SCRAPER_UTILS.getUsersLatestGames , 3 );
			let firsts = games.map( x => x[ 0 ] );
			let firsts_ids = firsts.map( x => x[ 4 ] );
			let largest_index = GET_LARGEST_INDEX_IN_ARRAY( firsts_ids );
			let likely_latest_username = firsts[ largest_index ][ 0 ];
			let likely_latest_games = games[ largest_index ];
			let result = _compute_streak( likely_latest_games , likely_latest_username );
			resolve( result );
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}
module.exports.getTwitchChannelStreak = compute_twitch_channel_streak;

// ( async ()=> {

// 	let results = await compute_twitch_channel_streak( "gothamchess" );
// 	console.log( results );

// })();