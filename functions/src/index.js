var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _this = this;
var _a = require("firebase-admin/app"), initializeApp = _a.initializeApp, cert = _a.cert;
var _b = require("firebase-admin/firestore"), getFirestore = _b.getFirestore, collection = _b.collection, doc = _b.doc, setDoc = _b.setDoc, query = _b.query;
var cors = require('cors')({ origin: 'http://localhost:3000' });
var onRequest = require('firebase-functions/v2/https').onRequest;
var scrapeDataHelper = require("./webscrape");
var firebaseConfig = require('./firebaseConfig.json');
var app = initializeApp(firebaseConfig);
var db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });
// query FireStore data for filtered listings as request from the front end.
exports.fetchListings = onRequest({ cors: true }, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
    var snapshot, uprightListings;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, db.collection('upright').get()];
            case 1:
                snapshot = _a.sent();
                uprightListings = [];
                snapshot.forEach(function (doc) {
                    uprightListings.push(doc.data());
                });
                return [2 /*return*/];
        }
    });
}); });
// scrape data from various bass sales website and add them to the FireStore.
// for usage as a Cloud Scheduler job to run every ~24hrs
exports.scrapeAndAdd = onRequest({ cors: true }, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
    var uprightListings, scrapeObject, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                uprightListings = [];
                scrapeObject = {
                    talkBass: true,
                };
                return [4 /*yield*/, scrapeDataHelper(scrapeObject)];
            case 1:
                uprightListings = _a.sent();
                addNewListings(uprightListings, 'upright');
                res.set('Access-Control-Allow-Origin', 'http://localhost:3000'); // TODO: change localhost:3000 to actual destination during production
                res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
                res.set('Access-Control-Allow-Headers', 'Content-Type');
                res.json(uprightListings);
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                console.error("Error fetching upright bass listings:", error_1);
                res.status(500).send("Internal server error");
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// helper functions for scrapeAndAdd
function addNewListings(listings, listingsType) {
    return __awaiter(this, void 0, void 0, function () {
        var _i, listings_1, listingData, sanitizedTitle, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _i = 0, listings_1 = listings;
                    _a.label = 1;
                case 1:
                    if (!(_i < listings_1.length)) return [3 /*break*/, 7];
                    listingData = listings_1[_i];
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    sanitizedTitle = listingData.title.replace(/[\/]/g, '-');
                    return [4 /*yield*/, db.collection('/' + listingsType).doc(sanitizedTitle).set(listingData)];
                case 3:
                    _a.sent();
                    console.log("Added listing for a ", listingData.title, " to the FireStore!");
                    return [3 /*break*/, 5];
                case 4:
                    error_2 = _a.sent();
                    console.log("Error adding listing: ", error_2);
                    return [3 /*break*/, 5];
                case 5:
                    ;
                    _a.label = 6;
                case 6:
                    _i++;
                    return [3 /*break*/, 1];
                case 7: return [2 /*return*/];
            }
        });
    });
}
;
