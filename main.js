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
( async ()=> {
	MyRedis = new RMU( 2 );
	await MyRedis.init();
	module.exports.redis = MyRedis;
	console.log( "Connected to Redis" );
	STREAK_SOLVER = require( "./streak_solver.js" );
	API_UTILS = require( "./api_utils.js" );
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
	ram_ram_ram_ram: { last_time: 0 , cooldown: 10 } ,
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
	channels: [ "#gothamchess" ] ,
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
	// let real_name_message = await API_UTILS.whoIsUserName( user_name );
	// if ( !real_name_message[ 1 ] ) { real_name_message = "No Data for " + user_name; }
	// if ( !real_name_message[ 0 ] ) { real_name_message = "No Data for " + real_name_message[ 1 ]; }
	// else { real_name_message = real_name_message[ 0 ]; }
	// if ( real_name_message.length < 2 ) { real_name_message = "No Data for " + user_name; }
	// irc_post( channel , real_name_message );
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
	//console.log( channel );
	//let streak_data = await API_UTILS.getTwitchChannelStreak( channel , user_name );
	let streak_data = await STREAK_SOLVER.getTwitchChannelStreak( channel );
	if ( !streak_data ) {
		//irc_post( channel , "User Offline" );
		return;
	}
	let user_name = streak_data.our_guy;
	console.log( streak_data );
	if ( streak_data.score < 1 ) {
		let msg = user_name + " vs " + streak_data.opponent + " = No Streak";
		console.log( msg );
		irc_post( channel , msg );
		return;
	}

	let message = streak_data.message + " " + "cbrahAdopt ".repeat( streak_data.score );
	irc_post( channel , message );
}

async function post_user_streak( channel , user_name ) {
	//console.log( channel );
	//let streak_data = await API_UTILS.getUsersCurrentStreak( channel , user_name );
	let streak_data = await STREAK_SOLVER.getUserStreak( user_name );
	if ( !streak_data ) {
		//irc_post( channel , "User Offline" );
		return;
	}
	//user_name = user_name || streak_data.our_guy;
	console.log( streak_data );
	if ( streak_data.score < 1 ) {
		let msg = streak_data.our_guy + /*" vs " + streak_data.opponent + */ " = No Streak";
		console.log( msg );
		irc_post( channel , msg );
		return;
	}

	let message = streak_data.message + " " + "cbrahAdopt ".repeat( streak_data.score );
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
		// Need to combine the second and third items in split message array
		// In case someone typed 'who is jaguar 92' instead of 'who is jaguar_92'
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