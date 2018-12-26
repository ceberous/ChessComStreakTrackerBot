const pALL = require( "p-all" );
var reds = require( "reds" );
const RMU = require( "redis-manager-utils" );
const MAKE_REQUEST = require( "./generic_utils.js" ).makeRequest;
const PROMISE_ALL = require( "./generic_utils.js" ).promiseAll;
const SLEEP = require( "./generic_utils.js" ).sleep;


var MyRedis = null;

const COUNTRY_ISOS_P1 = [ "AA" , "AB" , "AC" , "AD" , "AE" , "AF" , "AG" , "AH" , "AI" , "AJ", "AK" , "AL" , "AM"	, "AN" , "AO" , "AP" , "AQ" , "AR" , "AS" , "AT" , "AU" , "AV" , "AW" , "AX" , "AY"	, "AZ" ,
"BA" , "BB" , "BC" , "BD" , "BE" , "BF"	, "BG" , "BH" , "BI" , "BJ"	, "BK" , "BL" , "BM" , "BN" , "BO" , "BP" , "BQ" , "BR" , "BS" , "BT" , "BU" , "BV" , "BW" , "BX" , "BY"	, "BZ" ,
"CA" , "CB" , "CC" , "CD" , "CE" , "CF"	, "CG" , "CH" , "CI" , "CJ"	, "CK" , "CL" , "CM" , "CN" , "CO" , "CP" , "CQ" , "CR" , "CS" , "CT" , "CU" , "CV" , "CW" , "CX" , "CY" , "CZ" ,
"DA" , "DB" , "DC" , "DD" , "DE" , "DF"	, "DG" , "DH" , "DI" , "DJ"	, "DK" , "DL" , "DM" , "DN" , "DO" , "DP" , "DQ" , "DR" , "DS" , "DT" , "DU" , "DV" , "DW" , "DX" , "DY" , "DZ" ,
"EA" , "EB" , "EC" , "ED" , "EE" , "EF"	, "EG" , "EH" , "EI" , "EJ"	, "EK" , "EL" , "EM" , "EN" , "EO" , "EP" , "EQ" , "ER" , "ES" , "ET" , "EU" , "EV" , "EW" , "EX" , "EY" , "EZ" ,
"FA" , "FB" , "FC" , "FD" , "FE" , "FF"	, "FG" , "FH" , "FI" , "FJ"	, "FK" , "FL" , "FM" , "FN" , "FO" , "FP" , "FQ" , "FR" , "FS" , "FT" , "FU" , "FV" , "FW" , "FX" , "FY" , "FZ" ,
"GA" , "GB" , "GC" , "GD" , "GE" , "GF"	, "GG" , "GH" , "GI" , "GJ"	, "GK" , "GL" , "GM" , "GN" , "GO" , "GP" , "GQ" , "GR" , "GS" , "GT" , "GU" , "GV" , "GW" , "GX" , "GY" , "GZ" ,
"HA" , "HB" , "HC" , "HD" , "HE" , "HF"	, "HG" , "HH" , "HI" , "HJ"	, "HK" , "HL" , "HM" , "HN" , "HO" , "HP" , "HQ" , "HR" , "HS" , "HT" , "HU" , "HV" , "HW" , "HX" , "HY" , "HZ" ,
"IA" , "IB" , "IC" , "ID" , "IE" , "IF"	, "IG" , "IH" , "II" , "IJ"	, "IK" , "IL" , "IM" , "IN" , "IO" , "IP" , "IQ" , "IR" , "IS" , "IT" , "IU" , "IV" , "IW" , "IX" , "IY" , "IZ" ];

const COUNTRY_ISOS_P2 = [ "JA" , "JB" , "JC" , "JD" , "JE" , "JF" , "JG" , "JH" , "JI" , "JJ" , "JK" , "JL" , "JM" , "JN" , "JO" , "JP" , "JQ" , "JR" , "JS" , "JT" , "JU" , "JV" , "JW" , "JX" , "JY" , "JZ" ,
"KA" , "KB" , "KC" , "KD" , "KE" , "KF"	, "KG" , "KH" , "KI" , "KJ"	, "KK" , "KL" , "KM" , "KN" , "KO" , "KP" , "KQ" , "KR" , "KS" , "KT" , "KU" , "KV" , "KW" , "KX" , "KY" , "KZ" ,
"LA" , "LB" , "LC" , "LD" , "LE" , "LF"	, "LG" , "LH" , "LI" , "LJ"	, "LK" , "LL" , "LM" , "LN" , "LO" , "LP" , "LQ" , "LR" , "LS" , "LT" , "LU" , "LV" , "LW" , "LX" , "LY" , "LZ" ,
"MA" , "MB" , "MC" , "MD" , "ME" , "MF"	, "MG" , "MH" , "MI" , "MJ"	, "MK" , "ML" , "MM" , "MN" , "MO" , "MP" , "MQ" , "MR" , "MS" , "MT" , "MU" , "MV" , "MW" , "MX" , "MY" , "MZ" ,
"NA" , "NB" , "NC" , "ND" , "NE" , "NF"	, "NG" , "NH" , "NI" , "NJ"	, "NK" , "NL" , "NM" , "NN" , "NO" , "NP" , "NQ" , "NR" , "NS" , "NT" , "NU" , "NV" , "NW" , "NX" , "NY" , "NZ" ,
"OA" , "OB" , "OC" , "OD" , "OE" , "OF"	, "OG" , "OH" , "OI" , "OJ"	, "OK" , "OL" , "OM" , "ON" , "OO" , "OP" , "OQ" , "OR" , "OS" , "OT" , "OU" , "OV" , "OW" , "OX" , "OY" , "OZ" ,
"PA" , "PB" , "PC" , "PD" , "PE" , "PF"	, "PG" , "PH" , "PI" , "PJ"	, "PK" , "PL" , "PM" , "PN" , "PO" , "PP" , "PQ" , "PR" , "PS" , "PT" , "PU" , "PV" , "PW" , "PX" , "PY" , "PZ" ,
"QA" , "QB" , "QC" , "QD" , "QE" , "QF"	, "QG" , "QH" , "QI" , "QJ"	, "QK" , "QL" , "QM" , "QN" , "QO" , "QP" , "QQ" , "QR" , "QS" , "QT" , "QU" , "QV" , "QW" , "QX" , "QY" , "QZ" ,
"RA" , "RB" , "RC" , "RD" , "RE" , "RF"	, "RG" , "RH" , "RI" , "RJ"	, "RK" , "RL" , "RM" , "RN" , "RO" , "RP" , "RQ" , "RR" , "RS" , "RT" , "RU" , "RV" , "RW" , "RX" , "RY" , "RZ" ,
"SA" , "SB" , "SC" , "SD" , "SE" , "SF"	, "SG" , "SH" , "SI" , "SJ"	, "SK" , "SL" , "SM" , "SN" , "SO" , "SP" , "SQ" , "SR" , "SS" , "ST" , "SU" , "SV" , "SW" , "SX" , "SY" , "SZ" ];

const COUNTRY_ISOS_P3 = [ "TA" , "TB" , "TC" , "TD" , "TE" , "TF"	, "TG" , "TH" , "TI" , "TJ"	, "TK" , "TL" , "TM" , "TN" , "TO" , "TP" , "TQ" , "TR" , "TS" , "TT" , "TU" , "TV" , "TW" , "TX" , "TY" , "TZ" ,
"UA" , "UB" , "UC" , "UD" , "UE" , "UF"	, "UG" , "UH" , "UI" , "UJ"	, "UK" , "UL" , "UM" , "UN" , "UO" , "UP" , "UQ" , "UR" , "US" , "UT" , "UU" , "UV" , "UW" , "UX" , "UY" , "UZ" ,
"VA" , "VB" , "VC" , "VD" , "VE" , "VF"	, "VG" , "VH" , "VI" , "VJ"	, "VK" , "VL" , "VM" , "VN" , "VO" , "VP" , "VQ" , "VR" , "VS" , "VT" , "VU" , "VV" , "VW" , "VX" , "VY" , "VZ" ,
"WA" , "WB" , "WC" , "WD" , "WE" , "WF"	, "WG" , "WH" , "WI" , "WJ"	, "WK" , "WL" , "WM" , "WN" , "WO" , "WP" , "WQ" , "WR" , "WS" , "WT" , "WU" , "WV" , "WW" , "WX" , "WY" , "WZ" ,
"XA" , "XB" , "XC" , "XD" , "XE" , "XF"	, "XG" , "XH" , "XI" , "XJ"	, "XK" , "XL" , "XM" , "XN" , "XO" , "XP" , "XQ" , "XR" , "XS" , "XT" , "XU" , "XV" , "XW" , "XX" , "XY" , "XZ" ,
"YA" , "YB" , "YC" , "YD" , "YE" , "YF"	, "YG" , "YH" , "YI" , "YJ"	, "YK" , "YL" , "YM" , "YN" , "YO" , "YP" , "YQ" , "YR" , "YS" , "YT" , "YU" , "YV" , "YW" , "YX" , "YY" , "YZ" ,
"ZA" , "ZB" , "ZC" , "ZD" , "ZE" , "ZF"	, "ZG" , "ZH" , "ZI" , "ZJ"	, "ZK" , "ZL" , "ZM" , "ZN" , "ZO" , "ZP" , "ZQ" , "ZR" , "ZS" , "ZT" , "ZU" , "ZV" , "ZW" , "ZX" , "ZY" , "ZZ" ];
const usernames_in_country_base_url = "https://api.chess.com/pub/country/";
function get_usernames_in_country( country_iso_code ) {
	return new Promise( async function( resolve , reject ) {
		try {
			let url = usernames_in_country_base_url + country_iso_code + "/players";
			let players;
			players = await MAKE_REQUEST( url );
			if ( !players ) { resolve( false ); return; }
			try { players = JSON.parse( players ); }
			catch( e ) { resolve( false ); return; }
			players = players[ "players" ];
			console.log( players );

			const length = players.length;
			const interval = 1000;
			let consumed = 0;
			console.log( "Player Count == " + length.toString() );
			while( consumed < length ) {
				await MyRedis.setSetFromArray( "chess_com_players" , players.slice( consumed , interval ) );
				consumed = consumed + interval;
				console.log( "Consumed Indexs [" + consumed.toString() + "] through " + ( consumed + interval ).toString() );
				await SLEEP( 1000 );
			}
			if ( consumed !== length ) {
				console.log( "Consumed Remaining Indexs [" + consumed.toString() + "] through " + ( length - 1 ).toString() );
				await MyRedis.setSetFromArray( "chess_com_players" , players.slice( consumed , ( length - 1 ) ) );
				await SLEEP( 1000 );
			}
			resolve( true );
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}

function update_chess_com_usernames() {
	return new Promise( async function( resolve , reject ) {
		try {
			// await PROMISE_ALL( COUNTRY_ISOS_P1 , get_usernames_in_country , 3 );
			// await PROMISE_ALL( COUNTRY_ISOS_P2 , get_usernames_in_country , 3 );
			await PROMISE_ALL( COUNTRY_ISOS_P3 , get_usernames_in_country , 3 );
			resolve();
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}

function try_match_username( user_name ) {
	return new Promise( async function( resolve , reject ) {
		try {
			let search = reds.createSearch( user_name );
			resolve();
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}

// ( async ()=> {

// 	MyRedis = new RMU( 2 );
// 	await MyRedis.init();
// 	//await update_chess_com_usernames()
// 	reds.setClient( MyRedis.redis );
// 	await try_match_username( "chavir" );

// })();


// Jebaited again , last game is not updating in this json point
// html scraping pepoDance lol
// https://www.chess.com/games/archive/erichansen
// https://www.chess.com/games/archive?gameOwner=other_game&username=erichansen&gameType=recent&gameTypeall=live&gameTypeall=daily&gameResult=&opponent=&opening=&color=&gameTourTeam=&gameTitle=&timeSort=desc&rated=&startDate%5Bdate%5D=12%2F24%2F2018&endDate%5Bdate%5D=12%2F25%2F2018&fen=&ratingFrom=&ratingTo=&search=
const games_endpoint_base = "https://api.chess.com/pub/player/";
function get_users_latest_games( user_name ) {
	return new Promise( async function( resolve , reject ) {
		try {
			const today = new Date();
			const year = today.getFullYear().toString();
			let month = ( today.getMonth() + 1 );
			// So at somepoint it will matter that you can only get the month , not day from chess com
			// So like at midnight on the 1st we might not get the full list
			//let day = ( today.get )
			if ( month < 10 ) { month = "0" + month; }
			const url = games_endpoint_base + user_name + "/games/" + year + "/" + month;
			let data = await MAKE_REQUEST( url );
			if ( !data ) { resolve( false ); return; }
			data = JSON.parse( data );
			resolve( data.games.reverse() );
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}
module.exports.getUsersLatestGames = get_users_latest_games;

const online_status_endpoint_base = "https://api.chess.com/pub/player/";
function GET_LIVE_STATUS( user_name ) {
	return new Promise( async function( resolve , reject ) {
		try {
			let url = online_status_endpoint_base + user_name + "/is-online";
			let data = await MAKE_REQUEST( url );
			let conclusion = false;
			if ( data ) {
				data = JSON.parse( data );
				if ( data.online === true || data.online === "true" ) { conclusion = true; }
			}
			resolve( { username: user_name , status: conclusion } );
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}

// Maps Twitch Username to Chess.com Usernames that stream on the channel
const CHANNEL_MAP = {
	chessbrah: [ "erichansen" , "knvb" , "chessbrah" ] ,
	gmhikaru: [ "Hikaru" ] ,
	gothamchess: [  ] ,
	alexandrabotez: [  ] ,
	manneredmonkey: [ "ekurtz" ] ,
};

function GET_CHANNELS_LIVE_USERS( channel ) {
	return new Promise( function( resolve , reject ) {
		try {
			let wActions = CHANNEL_MAP[ channel ].map( x => async () => { let x1 = await GET_LIVE_STATUS( x ); return x1; } );
			pALL( wActions , { concurrency: 5 } ).then( result => {
				resolve( result );
			});
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}

function GET_USERS_GAMES( user_list ) {
	return new Promise( function( resolve , reject ) {
		try {
			let wActions = user_list.map( x => async () => { let x1 = await get_users_latest_games( x ); return x1; } );
			pALL( wActions , { concurrency: 5 } ).then( result => {
				resolve( result );
			});
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}

function GET_LATEST_LIVE_USER_IN_CHANNEL( channel ) {
	return new Promise( async function( resolve , reject ) {
		try {
			// Go figure its unreliable , users are streaming and it says they are offline randomly
			// let online = await PROMISE_ALL_LIVE_STATUS();
			// online = online.filter( x => x[ "status" ] !== false );
			// if ( online.length < 1 ) { resolve( false ); return; }
			// if ( online.length === 1 ) {
			// 	let latest_games = await get_users_latest_games( online[ 0 ] );
			// 	resolve( [ online[ 0 ] , latest_games ] );
			// 	return;
			// }
			//console.log( online );
			let games = await PROMISE_ALL_GAMES( CHANNEL_MAP[ channel ] );
			if ( !games ) { resolve( false ); return; }
			if ( games.length < 1 ) { resolve( false ); return; }
			let first_end_times = games.map( x => x[ 0 ][ "end_time" ] );
			let latest_time_index = first_end_times.reduce( ( iMax , x , i , arr ) => x > arr[ iMax ] ? i : iMax , 0 );
			let most_likely_username = online[ latest_time_index ][ "username" ];
			console.log( "Most Likely 'Live' User == " + most_likely_username );
			//resolve( [ most_likely_username , games[ latest_time_index ] ] );
			resolve( { username: most_likely_username , game_data: games[ latest_time_index ] } )
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}


function get_users_current_streak( channel , user_name ) {
	return new Promise( async function( resolve , reject ) {
		try {
			let result = { score: null , opponent: null , our_guy: null };
			let games;
			// If the !streak command didn't contain a chess.com username , attempt to find latest in channel map
			if ( !user_name ) {
				let latest_games_data = await GET_LATEST_LIVE_USER_IN_CHANNEL( channel );
				// TODO: Add expiration time , like if last game was over an hour ago , don't report
				user_name = latest_games_data.username;
				games = latest_games_data.game_data;
			}
			else {
				// Live Status Unreliable
				// let user_satus = await GET_LIVE_STATUS( user_name );
				// if ( !user_satus.status ) { resolve( false ); return; }
				games = await get_users_latest_games( user_name );
				if ( !games ) { resolve( false ); return; }
				if ( games.length < 2 ) { resolve( false ); return; }
			}
			//console.log( games );
			const last_opponent = ( games[ 0 ][ "white" ][ "username" ] === user_name ) ? games[ 0 ][ "black" ][ "username" ] : games[ 0 ][ "white" ][ "username" ];
			console.log( "Last Opponent == " + last_opponent );

			// const streak_games = games.filter( x =>
			// 	x[ "white" ][ "username" ] !== last_opponent && x[ "black" ][ "username" ] === last_opponent ||
			// 	x[ "black" ][ "username" ] !== last_opponent && x[ "white" ][ "username" ] === last_opponent
			// );

			let streak_games = [];
			for ( let i = 0; i < games.length; ++i ) {
				let white = games[ i ][ "white" ];
				let black = games[ i ][ "black" ];
				if ( white.username === last_opponent || black.username === last_opponent ) { streak_games.push( games[ i ] ); }
				else { break; }
			}
			//console.log( streak_games );
			// TODO : Add Reverse Adoption Score ?
			let streak = 0;
			for ( let i = 0; i < streak_games.length; ++i ) {
				let white = streak_games[ i ][ "white" ];
				let black = streak_games[ i ][ "black" ];
				console.log( i.toString() + " == " + white.username + " == " + white.result + " vs " + black.username + " == " + black.result );
				let our_guy = ( white.username === user_name ) ? white : black;
				if ( our_guy.result === "win" ) { streak = streak + 1; }
				else { break; }
			}
			//resolve( [ streak , last_opponent , user_name ] );
			result.score = streak;
			result.opponent = last_opponent;
			result.our_guy = user_name;
			resolve( result );
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}
module.exports.getUsersCurrentStreak = get_users_current_streak;

// function get_users_current_streak_vs_other_user( channel , user_name , other_user ) {

// }
// module.exports.getUsersCurrentStreakVSOtherUser = get_users_current_streak_vs_other_user;