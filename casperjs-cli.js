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
var cookiesFile = './cookies/'+email+'-cookies.txt';
var cookiesManager = require('./DCookieManagement').create(cookiesFile);
// cookiesManager
if(cookiesManager.cookieFileExists()){//Cookie file exists, try to read it
    cookiesManager.readCookies();//Read cookies from cookie file
    phantom.cookies = cookiesManager.phantomCookies;//Set phantom cookies
}

casper.start(amazon_url);
casper.thenClick('#a-autoid-0-announce', function () {
});

casper.then(function() {
    this.waitForSelector('#ap_email');
});

casper.then(function() {
    casper.sendKeys('input[name="email"]', email);
    casper.sendKeys('input[name="password"]', password);
    casper.capture('c1.png');
});

casper.then(function() {
    this.wait(2000);
});

casper.thenClick('#signInSubmit', function () {
});

//flag: 0: not login, 1: logined, 2: security code, 3: captcha

casper.then(function() {
    var titlePage = casper.getTitle();
    // titlePage = 'AAA'
    if(titlePage == 'Amazon.com Associates Central - Home') {
        console.log(1);
        cookiesManager.saveCookies(phantom.cookies);
        casper.thenOpen('https://affiliate-program.amazon.com/logout', function() {
            casper.capture('clogout.png');
        });
        casper.then(function() {
            this.exit();
        });
    } else {
        var captcha = casper.getPageContent().match(/Important Message!/g);
        // captcha = null
        if(captcha != null) {
            console.log(3);
            casper.exit()
        } else {
            casper.capture('sendcode1.png');
            this.waitForSelector('#continue');
            casper.thenClick('#continue', function () {});
            casper.capture('2.png');
            console.log(2);
            info = 'null';
            casper.then(function() {
                casper.repeat(numTimes, function() {

                    if(info.trim() != 'null') {
                        // console.log("co data")
                        this.bypass(numTimes - t - 1);
                    } else {
                        console.log("========Please update security code to PG==================")
                        console.log(info)
                        console.log("========Please update security code to PG==================")
                        console.log(this.getTitle())
                        console.log(this.getCurrentUrl())
                        casper.waitForExec('python',['getcode.py', email],
                            function(response) {
                                info = response.data['stdout'].trim();
                                // this.echo("Program finished by itself:" + info);
                            }, function(timeout, response) {
                                info = 'null';
                                this.echo("Timeout by itself:" + JSON.stringify(response.data));
                        });
                    }
                    t++;
                    this.wait(3000);
                });
            });
            casper.then(function() {
                console.log("========code==================")
                console.log(info)
                console.log("========code==================")
                casper.sendKeys('input[name="code"]', info);
                casper.click('input[type="submit"]');
            });
            casper.then(function() {
                this.waitForSelector('#a-page');
            });
            casper.then(function() {
                console.log(this.getTitle())
                console.log("==========================")
                console.log(this.getPageContent())
                console.log("==========================")
            });
            casper.thenOpen('https://affiliate-program.amazon.com/logout', function() {
               this.exit();
            });

        }

    }
});

casper.run();
