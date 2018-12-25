const request = require( "request" );

function MAKE_REQUEST( wURL ) {
	return new Promise( async function( resolve , reject ) {
		try {
			request( { url: wURL , headers: { "Cache-Control": "private, no-store, max-age=0" } } , async function ( err , response , body ) {
				if ( err ) { resolve("error"); return; }
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