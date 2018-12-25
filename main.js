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
			if ( channel_name.startsWith( "#" ) ) { channel_name = channel_name.substring( 1 ); }
			console.log( "About to Post in : " + channel_name );
			console.log( message );
			await IRC_Client.say( channel_name , message );
			resolve();
		}
		catch( error ) { console.log( error ); reject( error ); }
	 });
}

async function post_streak( user_name , channel ) {
	// Should be atomic
	//await API_Utils.getUsersLatestGames( "erichansen" );
	let streak_data = await API_Utils.getUsersCurrentStreak( user_name );
	console.log( streak_data );
	if ( streak_data[ 0 ] < 1 ) { return; }
	user_name = user_name || streak_data[ 2 ];
	let message = user_name + " vs " + streak_data[ 1 ] + " " + "cbrahAdopt ".repeat( streak_data[ 0 ] );
	irc_post( channel , message );
}

function on_message( from , to , text , message ) {
	if ( to.username === IRC_Identity.username ) { return; }
	//console.log( "Channel == " + from );
	console.log( to.username + " = " + text + "\n" );
	if ( text.startsWith( "!" ) ) {
		if ( text.startsWith( "!streak" ) ) {
			let username = text.split( " " );
			post_streak( username[ 1 ] , from );
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
