const cheerio = require( "cheerio" );
const API_UTILS = require( "./api_utils.js" );
const MAKE_REQUEST = require( "./generic_utils.js" ).makeRequest;
const MAKE_REQUEST_WITH_PUPPETEER = require( "./generic_utils.js" ).makeRequestWithPuppeteer;
const MATCH_NICKNAME = require( "./api_utils.js" ).matchNickName;

const CHANNEL_MAP = require( "./constants.js" ).CHANNEL_MAP;

const base_archive_url = "https://www.chess.com/games/archive/";
function scrape_game_archive_page( user_name , page_number ) {
	return new Promise( async function( resolve , reject ) {
		try {
			if ( !user_name ) { resolve( false ); return; }
			//if ( user_name.length < 1 ) { resolve( false ); return; }
			user_name = user_name.toLowerCase();
			console.log( "Scraping Games for 'Our Guy' " + user_name );
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
				let x_un_0 = $( usernames[ 0 ] ).attr( "data-username" );
				x_un_0 = x_un_0.toLowerCase();
				let x_un_1 = $( usernames[ 1 ] ).attr( "data-username" );
				x_un_1 = x_un_1.toLowerCase();
				x_usernames.push( x_un_0 );
				x_usernames.push( x_un_1 );
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
				//console.log( entry );
				final_results.push( entry );
			}
			//console.log( final_results );
			resolve( final_results );
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}
module.exports.getUsersLatestGames = scrape_game_archive_page;

const chess_com_profile_base_url = "https://www.chess.com/member/";
function scrape_chess_com_profile_stats( user_name ){
	return new Promise( async function( resolve , reject ) {
		try {
			// Todo: Add NickName Check

			user_name = user_name.toLowerCase();
			// Todo : Add Common Nickname Table
			let matched_nickname = MATCH_NICKNAME( user_name );
			if ( matched_nickname !== false ) {
				user_name = matched_nickname[ 0 ];
			}

			console.time( "scrape_stats" );
			let url = chess_com_profile_base_url + user_name;
			let body = await MAKE_REQUEST_WITH_PUPPETEER( url );
			if ( !body ) {
				console.log( "requst failed" );
				let matched = await API_UTILS.tryMatchUserName( user_name );
				if ( !matched.username ) { resolve( false ); return; }
				user_name = matched.username;
				url = chess_com_profile_base_url + user_name;
				body = await MAKE_REQUEST_WITH_PUPPETEER( url );
				if ( !body ) {
					resolve( false );
					return;
				}
			}
			try { var $ = cheerio.load( body ); }
			catch( err ) { resolve( false ); return; }
			let result = {};
			let ratings = $( 'span[class="user-rating"]' );
			for ( let i = 0; i < ratings.length; ++i ) {
				let text = $( ratings[ i ] ).parent().text();
				text = text.trim();
				text = text.split( "\n" );
				let label = text[ 0 ];
				let l_key = label.toLowerCase().replace( / /g , "_" );
				//console.log( l_key )
				if ( l_key === "3_check" ) { l_key = "three_check"; }
				let x = parseInt( text[ 1 ].trim() )
				if ( isNaN( x ) ) { /*console.log( text );*/ x = parseInt( text[ 2 ].trim() ) }
				//console.log( x );
				result[ l_key ] = { score: x , label: label };
			}
			console.timeEnd( "scrape_stats" );
			resolve( { username: user_name , result: result } );
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}
module.exports.getChessComUserStats = scrape_chess_com_profile_stats;



// Only Search Last Name ??
// http://ratings.fide.com/advaction.phtml?idcode=&name=Naroditsky&title=&other_title=&country=%25&sex=&srating=0&erating=3000&birthday=&radio=name&line=asc
// Then compare list to Real Name
const base_fide_search_url = "http://ratings.fide.com/advaction.phtml?idcode=&name=";
const end_fide_search_url = "&title=&other_title=&country=%25&sex=&srating=0&erating=3000&birthday=&radio=name&line=asc";
function scrape_fide_search_results( real_name ) {
	return new Promise( async function( resolve , reject ) {
		try {
			if ( !real_name ) { resolve( false ); return; }
			if ( real_name.length < 1 ) { resolve( false ); return; }
			real_name = real_name.split( " " );
			let search_name;
			if ( real_name[ 1 ] ) { search_name = real_name[ 1 ]; }
			else { search_name = real_name[ 0 ]; }
			let url = base_fide_search_url + search_name + end_fide_search_url;
			let body = await MAKE_REQUEST( url );
			if ( !body ) { resolve( false ); return; }
			try { var $ = cheerio.load( body ); }
			catch( err ) { resolve( false ); return; }
			let main_body = $( "table .mainbody" );
			let main_table = $( mainbody[ 0 ] ).children();
			main_table = main_table[ 0 ];
			let main_row = $( main_table ).children();
			main_row = main_row[ 1 ];
			resolve();
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}
module.exports.getFideProfile = scrape_game_archive_page;

// ( async ()=> {
// 	//await scrape_game_archive_page( "erichansen" );
// 	//await scrape_game_archive_page( "Daniel Naroditsky" );
// 	let result = await scrape_chess_com_profile_stats( "bless-rn" );
// 	console.log( result );
// })();