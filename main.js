process.on( "unhandledRejection" , function( reason , p ) {
	console.error( reason, "Unhandled Rejection at Promise" , p );
	console.trace();
});
process.on( "uncaughtException" , function( err ) {
	console.error( err , "Uncaught Exception thrown" );
	console.trace();
});

const tmi = require( "tmi.js" );
//const schedule = require( "node-schedule" );
const API_Utils = require( "./api_utils.js" );

function sleep( ms ) { return new Promise( resolve => setTimeout( resolve , ms ) ); }

const Personal = require( "./personal.js" );
const IRC_Identity = Personal.irc.identity;

var CHANNEL_COOLDOWN_MAP = {
	chessbrah: { last_time: 0 , cooldown: 10 } ,
	gmhikaru: { last_time: 0 , cooldown: 10 } ,
	gothamchess: { last_time: 0 , cooldown: 10 } ,
	alexandrabotez: { last_time: 0 , cooldown: 10 } ,
	manneredmonkey: { last_time: 0 , cooldown: 10 } ,
	dy_hydro_o: { last_time: 0 , cooldown: 10 } ,
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
	//channels: [ "#chessbrah" ]
	channels: [ "#dy_hydro_o" ]
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

async function post_streak( channel , user_name ) {
	//console.log( channel );
	let streak_data = await API_Utils.getUsersCurrentStreak( channel , user_name );
	if ( !streak_data ) {
		//irc_post( channel , "User Offline" );
		return;
	}
	user_name = user_name || streak_data.our_guy;
	console.log( streak_data );
	if ( streak_data.score < 1 ) {
		let msg = user_name + " vs " + streak_data.opponent + " = No Streak";
		console.log( msg );
		irc_post( channel , msg );
		return;
	}

	let message = user_name + " vs " + streak_data.opponent + " " + "cbrahAdopt ".repeat( streak_data.score );
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
			post_streak( channel , username[ 1 ] );
		}
	}
}

(async ()=>{
	// Watch Users to Know when they are online maybe ?
	// var j = schedule.scheduleJob('42 * * * *', function(){
	//	console.log('The answer to life, the universe, and everything!');
	// });
	await IRC_Client.connect();
	console.log( "connected" );
	IRC_Client.on( "message" , on_message );
	//post_streak();
})();
