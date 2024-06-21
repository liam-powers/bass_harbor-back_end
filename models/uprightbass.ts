import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const uprightBassSchema = new Schema({
    title : {
        type: String,
        required: true
    },
    imgLink : {
        type: String,
        required: true
    },
    listingLink: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    saleStatus: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    year: {
        type: Number,
        require: false
    },
    maker: {
        type: String,
        require: false
    },
}, { timestamps: true });

const UprightBass = mongoose.model('UprightBass', uprightBassSchema);
export default UprightBass;