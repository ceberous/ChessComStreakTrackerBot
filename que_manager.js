//const MyRedis = require( "./main.js" ).redis;
var MyRedis = null;

// https://redis.io/commands/linsert
function insert_into_que( channel , twitch_username , chess_com_username , index ) {
	return new Promise( async function( resolve , reject ) {
		try {
			let rkey = "que:" + channel;
			// let next = await MyRedis.listRPOP( rkey );
			// next = JSON.parse( next );
			resolve( next );
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}


function get_que( channel ) {
	return new Promise( async function( resolve , reject ) {
		try {
			let rkey = "que:" + channel;
			// let next = await MyRedis.listRPOP( rkey );
			// next = JSON.parse( next );
			resolve( next );
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}

function next_username_in_que( channel ) {
	return new Promise( async function( resolve , reject ) {
		try {
			let rkey = "que:" + channel;
			console.log( rkey );
			let next = await MyRedis.listRPOP( rkey );
			next = JSON.parse( next );
			resolve( next );
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}

function add_username_to_que( channel , twitch_username , chess_com_username ) {
	return new Promise( async function( resolve , reject ) {
		try {
			let rkey = "que:" + channel;
			let data_store = { twitch_channel: channel , twitch_username: twitch_username , chess_com_username: chess_com_username };
			data_store = JSON.stringify( data_store );
			await MyRedis.listLPUSH( rkey , data_store );
			resolve();
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}

function remove_username_from_que( channel , twitch_username , chess_com_username ) {
	return new Promise( async function( resolve , reject ) {
		try {
			// let rkey = "que:" + channel;
			// let data_store = { twitch_channel: channel , twitch_username: twitch_username , chess_com_username: chess_com_username };
			// data_store = JSON.stringify( data_store );
			// await MyRedis.listLPUSH( rkey , data_store );
			resolve();
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}

function handle_que_message( channel , twitch_username , message ) {
	return new Promise( async function( resolve , reject ) {
		try {
			message = message.split( " " );
			let command = "add";
			let chess_com_username;
			if ( message.length < 2 ) { resolve( false ); return; }
			command = message[ 1 ];
			chess_com_username = message[ 2 ];
			// Todo: Add Username Verification
			console.log( command );
			console.log( twitch_username );
			console.log( chess_com_username );
			let result;
			if ( command === "add" ) {
				result = await add_username_to_que( channel , twitch_username , chess_com_username );
			}
			else if ( command === "remove" ) {

			}
			else if ( command === "next" ) {
				result = await next_username_in_que( channel );
			}
			resolve( result );
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}
module.exports.handleQueMessage = handle_que_message;

// Testing
// All kinds of potential problems
// Have to add in a set for each que list so everything is verified unique
// ===========================
const RMU = require( "redis-manager-utils" );
( async ()=> {
	MyRedis = new RMU( 2 );
	await MyRedis.init();
	// await handle_que_message( "chessbrah" , "dy_hydro_o" , "!que bless-rng" );
	// await handle_que_message( "chessbrah" , "one" , "!que testing-1" );
	// await handle_que_message( "chessbrah" , "two" , "!que testing-2" );
	// await handle_que_message( "chessbrah" , "three" , "!que testing-3" );

	let next = await handle_que_message( "chessbrah" , "three" , "!que next" );
	console.log( next );
})();
// ===========================