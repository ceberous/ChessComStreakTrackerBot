const request = require( "request" );
const puppeteer = require( "puppeteer" );
const pALL = require( "p-all" );

function sleep( ms ) { return new Promise( resolve => setTimeout( resolve , ms ) ); }
module.exports.sleep = sleep;

function MAKE_REQUEST( wURL ) {
	return new Promise( async function( resolve , reject ) {
		try {
			request( { url: wURL , headers: { "Cache-Control": "private, no-store, max-age=0" } } , async function ( err , response , body ) {
				if ( err ) { resolve( false ); return; }
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
module.exports.makeRequest = MAKE_REQUEST;

function MAKE_REQUEST_WITH_PUPPETEER( wURL ) {
	// https://github.com/GoogleChrome/puppeteer/issues/822
	return new Promise( async function( resolve , reject ) {
		try {
			console.log( "Searching --> " + wURL );
			const browser = await puppeteer.launch( /* { args: [ "--disable-http2" ] } */ );
			const page = await browser.newPage();
			await page.goto( wURL /* , { waitUntil: "networkidle2" } */ );
			var wBody = await page.content();
			await browser.close();
			resolve( wBody );
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}
module.exports.makeRequestWithPuppeteer = MAKE_REQUEST_WITH_PUPPETEER;


function PROMISE_FUNCTION_TO_ALL_ARRAY( wArray , wFunction , wConcurrency ) {
	return new Promise( function( resolve , reject ) {
		try {
			wConcurrency = wConcurrency || 3;
			let wActions = wArray.map( x => async () => { let x1 = await wFunction( x ); return x1; } );
			pALL( wActions , { concurrency: wConcurrency } ).then( result => {
				resolve( result );
			});
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}
module.exports.promiseAll = PROMISE_FUNCTION_TO_ALL_ARRAY;


function GET_INDEX_OF_LARGEST_IN_ARRAY( wArray ) {
	return wArray.reduce( ( iMax , x , i , arr ) => x > arr[ iMax ] ? i : iMax , 0 );
}
module.exports.getLargestIndexInArray = GET_INDEX_OF_LARGEST_IN_ARRAY;