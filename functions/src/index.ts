const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
// const cors = require('cors');
const { onRequest } = require('firebase-functions/v2/https');
const scrapeData = require("./helpers/webscrape");
const firebaseConfig = require('../firebaseConfig.json');

initializeApp(firebaseConfig); //TODO: may need to save this as an app variable later.
const db = getFirestore();

db.settings({ ignoreUndefinedProperties: true });

import type { UprightBassListing } from './interfaces/UprightBassListing';

// query FireStore data for filtered listings as request from the front end.
exports.fetchListings = onRequest(
    { cors: true },
    async (req: any, res: any) => {
        try {
            const { priceRange, keywords, carved, hybrid, plywood } = req.body;
            let uprightRef = db.collection('upright');
            let queryRef = uprightRef;

            // Apply price range filter
            if (priceRange && priceRange.length === 2) {
                queryRef = queryRef.where('price', '>=', priceRange[0]);
                queryRef = queryRef.where('price', '<=', priceRange[1]);
            }

            // Fetch documents with initial filters
            const snapshot = await queryRef.get();
            let uprightListings: UprightBassListing[] = [];

            snapshot.forEach((doc: any) => {
                let data = doc.data() as UprightBassListing;

                // Apply additional filters
                let matchKeywords = true;
                if (keywords && keywords.length > 0) {
                    matchKeywords = keywords.every((keyword: string) => (data.title ?? "").toLowerCase().includes(keyword.toLowerCase()));
                }

                let matchCarved = true;
                if (carved) {
                    matchCarved = (data.title ?? "").toLowerCase().includes('carved');
                }

                let matchHybrid = true;
                if (hybrid) {
                    matchHybrid = (data.title ?? "").toLowerCase().includes('hybrid');
                }

                let matchPlywood = true;
                if (plywood) {
                    matchPlywood = (data.title ?? "").toLowerCase().includes('plywood');
                }

                if (matchKeywords && matchCarved && matchHybrid && matchPlywood) {
                    uprightListings.push(data);
                }
            });

            res.status(200).json(uprightListings);
        } catch (error) {
            console.error("Error fetching upright bass listings:", error);
            res.status(500).send("Internal server error");
        }
    }
);



// scrape data from various bass sales website and add them to the FireStore.
// for usage as a Cloud Scheduler job to run every ~24hrs
exports.scrapeAndAdd = onRequest(
    { cors: true },
    async (req: any, res: any) => {
        try {
            console.log("Now inside scrapeAndAdd function...");
            let uprightListings: UprightBassListing[] = [];

            let scrapeObject = {
                talkBass: true,
                scrapeBassChatData: true,
            };

            uprightListings = await scrapeData(scrapeObject);
            // console.log("uprightListings: ", uprightListings);
            console.log("sample uprightListing: ", uprightListings[0]);
            addNewListings(uprightListings);
            res.json(uprightListings);
        } catch (error) {
            console.error("Error fetching upright bass listings:", error);
            res.status(500).send("Internal server error");
        }
    }
);

// helper functions for scrapeAndAdd
async function addNewListings(listings: UprightBassListing[]) {
    console.log("inside addListings");

    for (const listingData of listings) {
        try {
            if (!listingData.title) {
                console.log("No title for this listing, skipping...");
                continue;
            }
            const sanitizedTitle = listingData.title.replace(/[\/]/g, '-');

            await db.collection('/upright').doc(sanitizedTitle).set(listingData);
            // console.log("Added listing for a ", listingData.title, " to the FireStore!");
        } catch (error) {
            console.log("Error adding listing: ", error);
        };
    }
};