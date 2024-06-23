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
        // const uprightRef = collection(db, 'upright');
        // const filters = req.data;
        // const q = query(uprightRef)
        const snapshot = await db.collection('upright').get();
        let uprightListings: UprightBassListing[] = [];
        snapshot.forEach((doc: any) => {
            uprightListings.push(doc.data() as UprightBassListing);
        });
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
                talkBass: false,
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