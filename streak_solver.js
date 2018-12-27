const API_UTILS = require( "./api_utils.js" );
const SCRAPER_UTILS = require( "./scraper_utils.js" );

const PROMISE_ALL = require( "./generic_utils.js" ).promiseAll;
const GET_LARGEST_INDEX_IN_ARRAY = require( "./generic_utils.js" ).getLargestIndexInArray;

const CHANNEL_MAP = require( "./constants.js" ).CHANNEL_MAP;

function _compute_streak( games , user_name , channel ) {
	const last_opponent = games[ 0 ][ 2 ];
	console.log( "Last Opponent == " + last_opponent );
	channel = channel || "chessbrah";
	let emote;
	if ( !CHANNEL_MAP[ channel ] ) { emote = "cbrahAdopt"; }
	else { emote = CHANNEL_MAP[ channel ].emote; }
	let result = { score: 0 , reverse_score: 0 , opponent: last_opponent , our_guy: user_name , message: "" };

	// Todo: Calculate Total Overall Score vs Last Opponent

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
	// Reverse Adoption Score ?
	if ( result.score === 0 ) {
		for ( let i = 0; i < games.length; ++i ) {
			if ( games[ i ][ 2 ] === last_opponent ) {
				console.log( i.toString() + " == " + user_name + " == " + games[ i ][ 1 ] + " vs " + last_opponent + " == " + games[ i ][ 3 ] );
				if ( games[ i ][ 3 ] === "1" ) {
					result.reverse_score = result.reverse_score + 1;
				}
				else { break; }
			}
			else { break; }
		}
	}
	if ( result.reverse_score > 0 ) {
		//result.message =  user_name + " vs " + last_opponent + " [-" + result.reverse_score.toString() + "] = Reverse Adoption PogChamp BibleThump";
		result.message =  user_name + " vs " + last_opponent + " [-" + result.reverse_score.toString() + "] = Reverse BibleThump";
	}
	else if ( result.score > 0 ) {
		result.message = user_name + " vs " + last_opponent + " [" + result.score.toString() + "] " + ( emote + " " ).repeat( result.score );;
	}
	else {
		result.message = user_name + " vs " + last_opponent + " = No Streak";
	}
	return result;
}

function compute_user_streak( user_name , channel ) {
	return new Promise( async function( resolve , reject ) {
		try {
			let best_guess = await API_UTILS.tryMatchUserName( user_name );
			if ( !best_guess.username ) { resolve( false ); return; }
			let result;
			if ( best_guess.method === "nickname" ) {
				result = await compute_twitch_channel_streak( best_guess.channel );
			}
			else {
				let games = await SCRAPER_UTILS.getUsersLatestGames( best_guess.username );
				result = _compute_streak( games , best_guess.username , channel );
			}
			resolve( result );
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}
module.exports.getUserStreak = compute_user_streak;


function compute_twitch_channel_streak( channel ) {
	return new Promise( async function( resolve , reject ) {
		try {
			console.log( "Trying to Find Latest Twitch Channel : " + channel + " latest 'Live' User" );
			if ( !CHANNEL_MAP[ channel ] ) { resolve( false ); return; }
			let games = await PROMISE_ALL( CHANNEL_MAP[ channel ].usernames , SCRAPER_UTILS.getUsersLatestGames , 3 );
			let firsts = games.map( x => x[ 0 ] );
			let firsts_ids = firsts.map( x => x[ 4 ] );
			let largest_index = GET_LARGEST_INDEX_IN_ARRAY( firsts_ids );
			let likely_latest_username = firsts[ largest_index ][ 0 ];
			let likely_latest_games = games[ largest_index ];
			let result = _compute_streak( likely_latest_games , likely_latest_username , channel );
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