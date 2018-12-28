process.on( "unhandledRejection" , function( reason , p ) {
	console.error( reason, "Unhandled Rejection at Promise" , p );
	console.trace();
});
process.on( "uncaughtException" , function( err ) {
	console.error( err , "Uncaught Exception thrown" );
	console.trace();
});

const tmi = require( "tmi.js" );
const RMU = require( "redis-manager-utils" );
//const schedule = require( "node-schedule" );

var MyRedis = null;
var STREAK_SOLVER = null;
var API_UTILS = null;
var SCRAPER_UTILS = null;
( async ()=> {
	MyRedis = new RMU( 2 );
	await MyRedis.init();
	module.exports.redis = MyRedis;
	console.log( "Connected to Redis" );
	STREAK_SOLVER = require( "./streak_solver.js" );
	API_UTILS = require( "./api_utils.js" );
	SCRAPER_UTILS = require( "./scraper_utils.js" );
})();

const sleep = require( "./generic_utils.js" ).sleep;

let Personal;
try{ Personal = require( "./personal.js" ); }
catch( e ) { Personal = require( "../personal_chess_com_streak_bot.js" ); }
const IRC_Identity = Personal.irc.identity;

var CHANNEL_COOLDOWN_MAP = {
	chessbrah: { last_time: 0 , cooldown: 10 } ,
	gmhikaru: { last_time: 0 , cooldown: 10 } ,
	gothamchess: { last_time: 0 , cooldown: 10 } ,
	alexandrabotez: { last_time: 0 , cooldown: 10 } ,
	manneredmonkey: { last_time: 0 , cooldown: 10 } ,
	dy_hydro_o: { last_time: 0 , cooldown: 10 } ,
	ram_ram_ram_ram: { last_time: 0 , cooldown: 10 }
};

const IRC_Client = new tmi.client({
 	connection: {
		reconnect: true,
		secure: true
	} ,
	options: {
		debug: true
	},
	identity: IRC_Identity ,
	//channels: [ "#chessbrah" ] ,
	//channels: [ "#gothamchess" , "#dy_hydro_o" ] ,
	channels: [ "#dy_hydro_o" ] ,
	//channels: [ "#dy_hydro_o" , "#ram_ram_ram_ram" ]
});

function irc_post( channel_name , message ) {
	return new Promise( async function( resolve , reject ) {
		try {
			if ( !CHANNEL_COOLDOWN_MAP[ channel_name ] ) { resolve( false ); return; } // Not Tracking Stuff here
			const now = new Date();
			const time_diff = now - CHANNEL_COOLDOWN_MAP[ channel_name ].last_time;
			if ( ( time_diff ) < CHANNEL_COOLDOWN_MAP[ channel_name ].cooldown ) {
				let msg = "Please wait "  + time_diff.toString() + " seconds";
				// Whisper User the msg
				console.log( msg );
				resolve();
				return;
			}
			console.log( "About to Post in : " + channel_name );
			console.log( message );
			await IRC_Client.say( channel_name , message );
			CHANNEL_COOLDOWN_MAP[ channel_name ].last_time = now;
			resolve();
		}
		catch( error ) { console.log( error ); reject( error ); }
	 });
}

// { username: user_name , message: null , best_match: false , real_name: false };
async function post_who_is_user_name( channel , user_name ) {
	let final_message;
	let result = await API_UTILS.whoIsUserName( user_name );
	if ( !result.message ) {
		if ( result.best_match ) {
			// Username provided doesn't exist ,
			// but tried to guess Best Match ,
			// However , there still is no 'Real Name' for the 'Best Match'
			final_message = "no data for " + result.best_match;
		}
		else {
			final_message = "no data for " + user_name;
		}
	}
	else {
		final_message = result.message;
	}
	irc_post( channel , final_message );
}

async function post_twitch_channel_streak( channel ) {
	let streak_data = await STREAK_SOLVER.getTwitchChannelStreak( channel );
	if ( !streak_data ) {
		//irc_post( channel , "User Offline" );
		return;
	}
	console.log( streak_data );
	irc_post( channel , streak_data.message );
}

async function post_user_streak( channel , user_name ) {
	let streak_data = await STREAK_SOLVER.getUserStreak( user_name , channel );
	if ( !streak_data ) {
		//irc_post( channel , "User Offline" );
		return;
	}
	console.log( streak_data );
	irc_post( channel , streak_data.message );
}

async function post_user_stats( channel , user_name , type ) {
	let matched = await API_UTILS.tryMatchUserName( user_name );
	if ( !matched.username ) { return; }
	let stats_data = await SCRAPER_UTILS.getChessComUserStats( matched.username );
	if ( !stats_data ) {
		//irc_post( channel , "No User Stats" );
		return;
	}
	console.log( stats_data );
	type = type || "fide";
	if ( type === "puzzle" || type === "pr" ) { type = "puzzle_rush"; }
	if ( type === "960" ) { type = "live_960"; }
	let l_key = type.toLowerCase().replace( / /g , "_" );
	let message;
	if ( !stats_data[ l_key ] ) { message = matched.username + type + " = uknown"; }
	else {
		message = matched.username + " " + stats_data[ l_key ].label + " = " + stats_data[ l_key ].score;
	}
	console.log( message );
	irc_post( channel , message );
}

function on_message( from , to , text , message ) {
	if ( to.username === IRC_Identity.username ) { return; }
	//console.log( "Channel == " + from );
	console.log( to.username + " = " + text + "\n" );
	if ( text.startsWith( "!" ) ) {
		if ( text.startsWith( "!streak" ) ) {
			let username = text.split( " " );
			let channel = from.substring( 1 );
			if ( username[ 1 ] ) {
				post_user_streak( channel , username[ 1 ] );
			}
			else {
				post_twitch_channel_streak( channel );
			}
		}
		else if ( text.startsWith( "!stats" ) ) {
			let username = text.split( " " );
			let channel = from.substring( 1 );
			if ( username[ 2 ] ) {
				post_user_stats( channel , username[ 1 ] , username[ 2 ] );
			}

		}
		// Need to combine the second and third items in split message array
		// In case someone typed 'who is jaguar 92' instead of 'who is jaguar_92'
		// ToDo: Add FIDE lookup to include url
		else if ( text.startsWith( "!who" ) ) {
			let username = text.split( " " );
			if ( username[ 1 ] === "is" ) {
				username = username[ 2 ];
			}
			else { username = username[ 1 ]; }
			let channel = from.substring( 1 );
			post_who_is_user_name( channel , username );
		}
		else if ( text.startsWith( "!whois" ) ) {
			let username = text.split( " " );
			let channel = from.substring( 1 );
			post_who_is_user_name( channel , username[ 1 ] );
		}
	}
	// Ask vsim
	// else if ( text.startsWith( "who" ) ) {
	// 	let channel = from.substring( 1 );
	// 	let username = text.split( " " );
	// 	if ( username[ 1 ] === "is" ) {
	// 		post_who_is_user_name( channel , username[ 2 ] );
	// 	}
	// 	// else { username = username[ 1 ]; }
	// 	// post_who_is_user_name( channel , username );
	// }
}

(async ()=>{
	// Watch Users to Know when they are online maybe ?
	// var j = schedule.scheduleJob('42 * * * *', function(){
	//	console.log('The answer to life, the universe, and everything!');
	// });
	await IRC_Client.connect();
	console.log( "Chess Com Streak Bot Restarted" );
	IRC_Client.on( "message" , on_message );
	//await API_UTILS.updateUserNamesRedis();
	//post_streak();
})();