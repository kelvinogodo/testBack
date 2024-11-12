const mongoose = require('mongoose')

const user = new mongoose.Schema(
  {
    firstname: { type: String },
    username: { type: String },
    lastname: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    funded: { type: Number, default: 0 },
    demobal: { type: Number, default: 10000 },
    copybal: { type: Number, default: 0 },
    netbal: { type: Number, default: 0 },
    fundedacctbal: { type: Number, default: 0 },
    regNo: { type: Number },
    connected: {type: Boolean, default: false},
    connector: {type: String, default: "deo@gmail.com"},
    investment: { type:[Object] },
    transaction: { type:[Object], default: [] },
    ftransaction: { type:[Object], default: [] },
    withdraw: { type:[Object] },
    deposit:{ type:[Object], default:[] },
    rememberme:{type:Boolean},
    verified:{type:Boolean, default:true},
    referral:{type:String,unique:true},
    refBonus:{type:Number},
    referred:{type:[Object],default:[]},
    phonenumber:{type:String,default:''},
    state:{type: String,default:''},
    country:{type: String,default:''},
    zipcode:{type: String,default:''},
    address:{type: String,default:''},
    profilepicture:{type:String,default:'https://res.cloudinary.com/dohhwcaam/image/upload/v1716207772/5907_iwwhqp.jpg'},
    totalprofit:{type:Number,default:0},
    periodicProfit:{type:Number,default:0},
    totaldeposit:{type:Number,default:0},
    totalwithdraw:{type:Number,default:0},
    promo:{type:Boolean,default:false},
    role: {type: String, default: 'user', enum: ['user', 'expert', 'admin']},
    capital: {type: Number, default: 0},
    notification: {type: [Object], default: []},
    isfunded: {type: Boolean, default: false}
  }
)
const User = mongoose.models.User || mongoose.model('User', user)
module.exports = User