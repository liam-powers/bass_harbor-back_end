import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import cors from 'cors';
import { onRequest } from 'firebase-functions/v2/https';

import scrapeDataHelper from "./helpers/webscrape";
import firebaseConfig from '../firebaseConfig.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

interface FirestoreUprightBassListing {
    title?: string;
    imgLink: string;
    listingLink?: string;
    location?: string;
    saleStatus?: string;
    price?: string;
    year?: number;
    maker?: string;
}
// query FireStore data for filtered listings as request from the front end.
exports.fetchListings = onRequest(
    { cors: true },
    async (req: any, res: any) => {
        // const uprightRef = collection(db, 'upright');
        // const filters = req.data;
        // const q = query(uprightRef)
        const snapshot = await db.collection('upright').get();
        let uprightListings: FirestoreUprightBassListing[] = [];
        snapshot.forEach((doc: any) => {
            uprightListings.push(doc.data() as FirestoreUprightBassListing);
        });
    }
);


// scrape data from various bass sales website and add them to the FireStore.
// for usage as a Cloud Scheduler job to run every ~24hrs
exports.scrapeAndAdd = onRequest(
    { cors: true },
    async (req: any, res: any) => {
        try {
            let uprightListings: FirestoreUprightBassListing[] = [];

            let scrapeObject = {
                talkBass: true,
            };
            uprightListings = await scrapeDataHelper(scrapeObject);
            addNewListings(uprightListings, 'upright');
            res.set('Access-Control-Allow-Origin', 'http://localhost:3000'); // TODO: change localhost:3000 to actual destination during production
            res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.set('Access-Control-Allow-Headers', 'Content-Type');
            res.json(uprightListings);
        } catch (error) {
            console.error("Error fetching upright bass listings:", error);
            res.status(500).send("Internal server error");
        }
    }
);

// helper functions for scrapeAndAdd
async function addNewListings(listings: any, listingsType: any) {
    // let listingsRef: any = db.collection(listingsType);

    for (const listingData of listings) {
        try {
            const sanitizedTitle = listingData.title.replace(/[\/]/g, '-');
            await db.collection('/' + listingsType).doc(sanitizedTitle).set(listingData);
            console.log("Added listing for a ", listingData.title, " to the FireStore!");
        } catch (error) {
            console.log("Error adding listing: ", error);
        };
    }
};