var fs =  require('fs');
var moment = require('moment');
var system = require('system');
var env = system.env;

var casper = require('casper').create({
    pageSettings: {
        loadImages: false,
        loadPlugins: false,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.157 Safari/537.36'
    },
    logLevel: "info",
    verbose: false
});
var casper2 = require('casper').create({
    pageSettings: {
        loadImages: false,
        loadPlugins: false,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.157 Safari/537.36'
    },
    logLevel: "info",
    verbose: false
});
var info;
var info2;
phantom.cookiesEnabled = true;
phantom.javascriptEnabled = true;
var endPoint = 'https://affiliate-program.amazon.com/home/reports/table.json?';
var storeId = 'listmonematt-20';
var yesterday = moment().add(-2, 'days').format('YYYY-MM-DD');

var typeOrdersColumn = [
    'product_title',
    'clicks',
    'conversion',
    'asin',
    'direct_ordered_items',
    'indirect_ordered_items',
    'ordered_items'
];
var queryOrders = {
    'type': 'orders',
    'start_date': yesterday,
    'end_date': yesterday,
    'tag_id': 'all',
    'order': 'desc',
    'device_type': 'all',
    'last_accessed_row_index': 0,
    'group_by': 'none',
    'columns': typeOrdersColumn,
    'skip': 0,
    'sort': 'ordered_items',
    'limit': 25,
};

var typeEarningsColumn = [
    'product_title',
    'clicks',
    'asin',
    'shipped_items',
    'revenue',
    'commission_earnings',
    'returned_items',
    'returned_revenue',
    'returned_earnings',
];
var queryEarnings = {
    'type': 'earnings',
    'start_date': yesterday,
    'end_date': yesterday,
    'tag_id': 'all',
    'order': 'desc',
    'device_type': 'all',
    'last_accessed_row_index': 0,
    'group_by': 'none',
    'columns': typeEarningsColumn,
    'skip': 0,
    'sort': 'shipped_items',
    'limit': 25
};

var typeLinkTypeColumn = [
    'link_group_name',
    'is_header',
    'link_code',
    'link_type',
    'build_link',
    'impression_counts',
    'click_through_rate',
    'click_through_counts',
    'ordered_conversion',
    'ordered_units',
    'shipped_units',
    'shipped_earnings'
];
var queryLinkType = {
    'type': 'link_type',
    'start_date': yesterday,
    'end_date': yesterday,
    'tag_id': 'all',
    'order': 'desc',
    'device_type': 'all',
    'last_accessed_row_index': 0,
    'group_by': 'none',
    'columns': typeLinkTypeColumn,
    'skip': 0,
    'sort': 'title',
    'limit': 25
};

function createUrlEndPoint(params) {
    var query = '';
    for (item in params) {
        query+='query['+item+']='+params[item]+'&';
    }
    query = query+'store_id='+storeId;
    var resultEndPoint = endPoint + query;
    resultEndPoint = resultEndPoint.replace(/\[/g, '%5B');
    resultEndPoint = resultEndPoint.replace(/\]/g, '%5D');
    resultEndPoint = resultEndPoint.replace(/\,/g, '%2C');
    return resultEndPoint;
}

var ordersEndPoint = createUrlEndPoint(queryOrders);
var earningsEndPoint = createUrlEndPoint(queryEarnings);
var linkTypeEndPoint = createUrlEndPoint(queryLinkType);

var numTimes = 600; //wait 10m. 600s/3(delay) = 200
var t = 0;
var email = casper.cli.options['email']
var password = casper.cli.options['password']
var getcode_url = env.AIRFLOWAPI+'/getcode/'+email
var amazon_url = 'https://affiliate-program.amazon.com/'
var linklocal = 'http://localhost:8888'

//Create cookie manager object. Cookies will be saved in file called liveCookies.txt
var cookiesManager = require('./DCookieManagement').create("/tmp/"+email+"-cookies.txt");
// cookiesManager
if(cookiesManager.cookieFileExists()){//Cookie file exists, try to read it
    cookiesManager.readCookies();//Read cookies from cookie file
    phantom.cookies = cookiesManager.phantomCookies;//Set phantom cookies
}
var data = [];
casper.start(amazon_url);
casper.thenClick('#a-autoid-0-announce', function () {
});

casper.then(function() {
    this.waitForSelector('#ap_email');
});

casper.then(function() {
    casper.sendKeys('input[name="email"]', email);
    casper.sendKeys('input[name="password"]', password);
});

casper.then(function() {
    this.wait(2000);
});

casper.thenClick('#signInSubmit', function () {
});

casper.then(function() {
    this.wait(1000);
});

casper.then(function() {
    casper.capture('1.png');
    var titlePage = casper.getTitle();
    if(titlePage == 'Amazon.com Associates Central - Home') {
        casper.thenOpen(ordersEndPoint, function() {
            data.push(JSON.stringify(this.getPageContent()));
        });
        casper.thenOpen(earningsEndPoint, function() {
            data.push(JSON.stringify(this.getPageContent()));
        });
        casper.thenOpen(linkTypeEndPoint, function() {
            data.push(JSON.stringify(this.getPageContent()));
        });
        casper.then(function() {
            console.log(data);
            cookiesManager.saveCookies();
        })

        casper.thenOpen('https://affiliate-program.amazon.com/logout', function() {});
        casper.then(function() {
            this.exit();
        });
    } else {
        cookiesManager.saveCookies();
        console.log(this.getPageContent())
    }
});

casper.run();
