const cheerio = require( "cheerio" );
//const puppeteer = require( "puppeteer" );
const MAKE_REQUEST = require( "./generic_utils.js" ).makeRequest;

const CHANNEL_MAP = require( "./constants.js" ).CHANNEL_MAP;

const base_archive_url = "https://www.chess.com/games/archive/";
function scrape_game_archive_page( user_name , page_number ) {
	return new Promise( async function( resolve , reject ) {
		try {
			if ( !user_name ) { resolve( false ); return; }
			//if ( user_name.length < 1 ) { resolve( false ); return; }
			page_number = page_number || 1;
			let url = base_archive_url + user_name + "?page=" + page_number.toString();
			let body = await MAKE_REQUEST( url );
			try { var $ = cheerio.load( body ); }
			catch( err ) { resolve( false ); return; }
			let final_results = [];
			let game_table_data = $( "#content table tr" );
			let time = 0;

			for ( let i = 1; i < game_table_data.length; ++i ) {
				let final_obj = { usernames: [] , results: [] }
				let x_usernames = [];
				let x_results = [];
				let children = $( game_table_data[ i ] ).children();
				let usernames = $( children[ 0 ] ).find( ".user-tagline .username" );
				x_usernames.push( $( usernames[ 0 ] ).attr( "data-username" ) );
				x_usernames.push( $( usernames[ 1 ] ).attr( "data-username" ) );
				let results = $( children[ 1 ] ).find( ".game-result" );
				x_results.push( $( results[ 0 ] ).text() );
				x_results.push( $( results[ 1 ] ).text() );
				let entry;
				if ( user_name === x_usernames[ 0 ] ) {
					entry = [ x_usernames[ 0 ] , x_results[ 0 ] , x_usernames[ 1 ] , x_results[ 1 ] ];
				}
				else {
					entry = [ x_usernames[ 1 ] , x_results[ 1 ] , x_usernames[ 0 ] , x_results[ 0 ] ];
				}
				let game_id = $( children[ 1 ] ).children();
				game_id = $( game_id[ 0 ] ).attr( "href" );
				game_id = game_id.split( "?" )[ 0 ];
				game_id = game_id.split( "/game/" )[ 1 ];
				entry.push( game_id );
				final_results.push( entry );
			}
			//console.log( final_results );
			resolve( final_results );
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}
module.exports.getUsersLatestGames = scrape_game_archive_page;

// ( async ()=> {
// 	await scrape_game_archive_page( "erichansen" );
// })();