const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const mongoose = require('mongoose')
const User = require('./models/user.model')
const jwt = require('jsonwebtoken')
const path = require('path')
var serveStatic = require('serve-static')
const crypto = require('crypto')
const P2p = require('./models/p2p')
dotenv.config()
const Wallet = require('./models/wallet')
const Social = require('./models/socials')
const Withdraw = require('./models/withdrawal')

const app = express()

// mode: 'no-cors',
// comment made here for the cors chief comot for here abeg

app.use(cors())
// app.options('*', cors())

// app.use((req, res, next) => {
//   res.header({ "Access-Control-Allow-Origin": "*" });
//   next();
// })

app.use(serveStatic(path.join(process.cwd(), '/dist')))
app.get(
  [
    '/',
    '/dashboard',
    '/myprofile',
    '/login',
    '/signup',
    '/withdraw',
    '/plans',
    '/referrals',
    '/admin',
    '/fundwallet',
    '/transactions',
    '/investments',
    '/deposit',
    '/checkout',
    '/withdrawlogs',
    '/faq',
    '/about',
    '/policy',
    '/buybitcoin',
    '/users/:id/verify/:token',
    '/ref_register/:ref',
    '/resetpassword/:token'
  ],
  (req, res) => res.sendFile(path.join(process.cwd(), '/dist/index.html'))
)
app.use('/static', express.static('dist/static'))

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

const port = process.env.PORT || 5000

app.use(express.json())

mongoose.set('strictQuery', false)
mongoose.connect(process.env.ATLAS_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB', error);
  });
// mongoose.connect(process.env.ATLAS_URI, console.log('database is connected'))

app.get('/api/verify', async (req, res) => {
  const token = req.headers['x-access-token']
  try {
    const decode = jwt.verify(token, 'secret1258')
    const email = decode.email
    const user = await User.findOne({ email: email })
    if (user.rememberme === true) {
      res.json({
        status: 'ok',
      })
    }
    else {
      res.json({
        status: 'false',
      })
    }
  } catch (error) {
    res.json({ status: `error ${error}` })
  }
})

const createToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  })
};

const success = (statusCode, res, user, message) => {
  const token = createToken(user.id);
  const url = `${process.env.BASE_URL}auth/${user._id}/verify/${token}`;

  res.cookie('jwt', token, {
    expires: new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    // secure: req.secure || req.headers['x-access-token'] === 'http'
  });

  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    role: user.role,
    message,
    url,
    user
  });
}



app.post('/api/register', async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const firstname = req.body.firstName;
  const lastname = req.body.lastName;
  const username = req.body.userName;
  const refer = req.body.referralLink;
  const referralLink = crypto.randomBytes(8).toString("hex")
  const base = process.env.BASE_URL
  
  const generatedNumber =  () => {
    let number = '6';
    
    for (let i = 0; i < 7; i++) {
      number += Math.floor(Math.random()*6);
    }
    return number;
  }
  const uuid = generatedNumber()

  try {
    const user = await User.findOne({ email: email })

    if (user) {
      console.log('user already exists')
      return res.json({
        status: 'bad',
        message: 'Invalid email or user already exists'
      })
    }
    else if (refer !== '') {
      const referringUser = await User.findOne({ referral: refer })
      const now = new Date()
      if (referringUser) {
        await User.updateOne({ referral: refer }, {
          $push: {
            referred: {
              firstname:req.body.fullname,
              username: req.body.username,
              email: req.body.email,
              date: now.toLocaleString(),
              bonus: 200
            }
          }

        })
        await User.updateOne({ referral: refer }, {
          $set: { refBonus: referringUser.refBonus + 200 }
        })
      }
      // else {
      //   return res.json({
      //     status: "bad",
      //     message: "Sorry this user does not exist"
      //   })
      // }
    }

    const newUser = await User.create({
      firstname: firstname,
      lastname:lastname,
      username: username,
      email: email,
      password: password,
      funded: 0.00,
      investment: [],
      transaction: [],
      withdraw: [],
      rememberme: false,
      referral: `${referralLink}`,
      refBonus: 0,
      referred: [],
      periodicProfit: 0,
      role: 'user',
      verified: false,
      regNo: `${uuid}` // is this neccassary
    })

    const token = createToken(newUser.id);
    const url = `${process.env.BASE_URL}users/${newUser._id}/verify/${token}`

    return res.json({
      status: 'ok',
      newUser,
      url
    })

  } catch (error) {
    console.log(error)
    res.send(error)
  }
})

app.get('/:id/verify/:token', async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id })
    if (!user) {
      return res.json({ status: 400 })
    }
    else {
      await User.updateOne({ _id: user._id }, {
        $set: { verified: true }
      })
      res.json({ status: 200 })
    }
    
  } catch (error) {
    console.log(error)
    res.json({ status: `internal server error ${error}` })
  }
})

app.get('/api/getData', async (req, res) => {
  const token = req.headers['x-access-token']
  try {
    const decode = jwt.verify(token, 'secret1258')
    const email = decode.email
    const user = await User.findOne({ email: email })
    res.json({
      status: 'ok',
      firstname: user.username,
      lastname: user.username,
      email: user.email,
      funded: user.funded,
      invest:user.investment,
      copybal: user.copybal,
      netbal:user.netbal,
      regNo:user.regNo,
      connected: user.connected,
      connector: user.connector,
      transaction: user.transaction,
      ftransaction: user.ftransaction,
      withdraw: user.withdraw,
      refBonus: user.refBonus,
      referred: user.referred,
      referral: user.referral,
      phonenumber: user.phonenumber,
      state: user.state,
      zipcode: user.zipcode,
      address: user.address,
      profilepicture: user.profilepicture,
      country: user.country,
      totalprofit: user.totalprofit,
      totaldeposit: user.totaldeposit,      
      totalwithdraw: user.totalwithdraw,
      deposit: user.deposit,
      notification: user.notification,
      role: user.role,
      fundedbal: user.fundedacctbal,
      isfunded: user.isfunded
    })
  } catch (error) {
    res.json({ status: 'error', message: error.message })
  }
})

app.get('/api/getp2pdata', async (req, res) => {
  // { _id: '66542351827fedb29a501401' }
  const data = await P2p.findOne()
  return res.json({ status: 'ok', data })
})


app.patch('/api/updateUserPassword', async (req, res) => {
  const token = req.headers['x-access-token']
  try {
    const decode = jwt.verify(token, 'secret1258')
    const email = decode.email
    const user = await User.findOne({ email: email })

    if (user.password !== req.body.currentPass) {
      return res.json({ status: 400, message: "invaild password" })
    }
    else {
        await User.updateOne({
          email: user.email
        }, {
          $set: { 
            password: req.body.password
          }
        })
      console.log({
        msg: "hello dear i want to validate this data",
        image: user.password
      })
      return res.json({ status: 200, message: "password reset successful" })
    }
  } catch (error) {
    console.log(error)
    return res.json({ status: 500, message: "Something went wrong, please try again later" })
  }
})

app.post('/api/updateUserData', async (req, res) => {
  const token = req.headers['x-access-token']
  try {
    const decode = jwt.verify(token, 'secret1258')
    const email = decode.email
    const user = await User.findOne({ email: email })

    if (user && req.body.profilepicture !== undefined) {
      if (user.phonenumber !== req.body.phonenumber || user.state !== req.body.state || user.profilepicture !== req.body.profilepicture) {
        await User.updateOne({
          email: user.email
        }, {
          $set: {
            phonenumber: req.body.phonenumber,
            profilepicture: req.body.profilepicture,
            state: req.body.state,
            zipcode: req.body.zipcode,
            country: req.body.country,
            address: req.body.address,
            firstname: req.body.firstname,
            lastname: req.body.lastname
          }
        })
      }
      return res.json({ status: 200 })
    }
    else {
      console.log({
        msg: "hello dear i want to validate this",
        image: user.profilepicture
      })
      return res.json({ stauts: 400, profile: user.profilepicture })
    }
  } catch (error) {
    console.log(error)
    return res.json({ status: 500 })
  }
})


app.post('/api/changeWithdrawalMsg', async (req, res) => {
  try {
    const msg = req.body.msg
    console.log({
      msg
    })

    const text = await Withdraw.find()

  if(text.length === 0) {
    console.log("no messages here")

    await Withdraw.create({
      message: msg,
      
    })
    
    res.json({ status: 'ok', message: "message changed"})
  }
  else {
    await Withdraw.updateOne({
      $set: {
        message: msg,
      }
    })
    return res.json({
      status: 'ok',
      message: "message changed successfully"
    })
  }

  } catch (error) {
    console.log(error)
    res.json({ status: 'error' })
  }
})

app.get('/api/wmessage', async (req, res) => {
  const text = await Withdraw.findOne();
   res.json({message: text.message})
})



app.post('/api/fundwallet', async (req, res) => {
  try {
    const email = req.body.email
    const incomingAmount = req.body.amount
    const acct = req.body.acct
    const user = await User.findOne({ email: email })
    console.log({
      acct,incomingAmount,email
    })

  if(acct === 'funded') {

    await User.updateOne(
      { email: email }, {
      $set: {
        funded: incomingAmount + user.funded,
        capital: incomingAmount + user.capital
      }
    }
    )
    await User.updateOne(
      { email: email },
      {
        $push: {
          deposit: {
            date: new Date().toLocaleString(),
            amount: incomingAmount,
            id: crypto.randomBytes(8).toString("hex"),
            balance: incomingAmount + user.funded
          }, 
        //   transaction: {
        //   type: 'Deposit',
        //   amount: incomingAmount,
        //   date: new Date().toLocaleString(),
        //   balance: incomingAmount + user.funded,
        //   id: crypto.randomBytes(8).toString("hex"),
        // }
        }
      }
    )
    res.json({ status: 'ok', funded: req.body.amount, name: user.username, email: user.email })
  }
  else if(acct === 'capital') {

    await User.updateOne(
      { email: email }, {
      $set: {
        capital: incomingAmount + user.capital
      }
    }
    )
   return res.json({ status: 'ok', funded: req.body.amount, name: user.username, email: user.email })
  }
  else if(acct === 'refBonus') {

    await User.updateOne(
      { email: email }, {
      $set: {
        refBonus: incomingAmount + user.refBonus
      }
    }
    )
   return res.json({ status: 'ok', funded: req.body.amount, name: user.username, email: user.email })
  }
  else if(acct === 'totalprofit') {

    await User.updateOne(
      { email: email }, {
      $set: {
        totalprofit: incomingAmount + user.totalprofit
      }
    }
    )
   return res.json({ status: 'ok', funded: req.body.amount, name: user.username, email: user.email })
  }
  else {
    return res.json({
      status: 400,
      message: "Sorry something went wrong."
    })
  }

  } catch (error) {
    console.log(error)
    res.json({ status: 'error' })
  }
})

// api for debit acct
app.post('/api/debitwallet', async (req, res) => {
  try {
    const email = req.body.email
    const incomingAmount = req.body.amount
    const acct = req.body.acct
    const user = await User.findOne({ email: email })
    console.log({
      acct,incomingAmount,email
    })

  if(acct === 'funded') {

    if(incomingAmount >= user.funded) {
      return res.json({status: 400, message: "Insufficent balance chief"})
    } else {
    await User.updateOne(
      { email: email }, {
      $set: {
        funded: user.funded - incomingAmount
      }
    }
    )
    return res.json({ status: 'ok', funded: req.body.amount, name: user.username, email: user.email })
    }
  }
  else if(acct === 'capital') {

    if(incomingAmount >= user.capital) {
      return res.json({status: 400, message: "Insufficent balance chief"})
    } else {
    await User.updateOne(
      { email: email }, {
      $set: {
        capital: user.capital - incomingAmount
      }
    }
    )
    return res.json({ status: 'ok', funded: req.body.amount, name: user.username, email: user.email })
    }
  }
  else if(acct === 'refBonus') {

    if(incomingAmount >= user.refBonus) {
      return res.json({status: 400, message: "Insufficent balance chief"})
    } else {
    await User.updateOne(
      { email: email }, {
      $set: {
        refBonus: user.refBonus - incomingAmount
      }
    }
    )
   return res.json({ status: 'ok', funded: req.body.amount, name: user.username, email: user.email })
  }
  }
  else if(acct === 'totalprofit') {

    if(incomingAmount >= user.totalprofit) {
      return res.json({status: 400, message: "Insufficent balance chief"})
    } else {
    await User.updateOne(
      { email: email }, {
      $set: {
        totalprofit: user.totalprofit - incomingAmount
      }
    }
    )
   return res.json({ status: 'ok', funded: req.body.amount, name: user.username, email: user.email })
  }
  }  else {
    return res.json({
      status: 400,
      message: "Sorry something went run."
    })
  }

  } catch (error) {
    console.log(error)
    res.json({ status: 'error' })
  }
})

app.post('/api/changewallet', async (req, res) => {
  try {
    const Xrp = req.body.Xrp
    const Eth = req.body.Eth
    const Btc = req.body.Btc
    const Usdt = req.body.Usdt
    const Shib = req.body.Shib
    const Bnb = req.body.Bnb
    const Dodge = req.body.Dodge
    const Tesla = req.body.Tesla
    console.log({
      Xrp,Usdt,Tesla
    })

    const myWallet = await Wallet.find()

  if(myWallet.length === 0) {
    console.log("no wallets here")

    await Wallet.create({
      ETH: Eth,
      XRP: Xrp,
      BTC: Btc,
      USDT: Usdt,
      DODGE: Dodge,
      BNB: Bnb,
      SHIB: Shib,
      TESLA: Tesla,
      
    })
    
    res.json({ status: 'ok'})
  }
  else {
    await Wallet.updateMany({
      $set: {
        ETH: Eth,
        XRP: Xrp,
        BTC: Btc,
        USDT: Usdt,
        DODGE: Dodge,
        BNB: Bnb,
        SHIB: Shib,
        TESLA: Tesla
      }
    })
    return res.json({
      status: 'ok',
      message: "Wallet changed successfully"
    })
  }

  } catch (error) {
    console.log(error)
    res.json({ status: 'error' })
  }
})

app.post('/api/changeTRCwallet', async (req, res) => {
  try {
    const Trc = req.body.Trc
    console.log({
      Trc
    })

    const myWallet = await Wallet.find()

  if(myWallet.length === 0) {
    console.log("no wallets here")

    await Wallet.create({
      TRC: Trc
    })
    
    res.json({ status: 'ok'})
  }
  else {
    await Wallet.updateMany({
      $set: {
        TRC: Trc,
      }
    })
    return res.json({
      status: 'ok',
      message: "Wallet changed successfully"
    })
  }

  } catch (error) {
    console.log(error)
    res.json({ status: 'error' })
  }
})

app.get('/api/wallets', async (req, res) => {
  const address = await Wallet.findOne();
  return res.json(address)
})


app.post('/api/changeSocials', async (req, res) => {
  try {
    const social = req.body.social
    console.log({
      social
    })

    const link = await Social.find()

  if(link.length === 0) {
    console.log("no wallets here")

    await Social.create({
      whatsapp: social,
      
    })
    
    res.json({ status: 'ok', message: "link changed chief"})
  }
  else {
    await Social.updateOne({
      $set: {
        whatsapp: social,
      }
    })
    return res.json({
      status: 'ok',
      message: "Social link changed successfully"
    })
  }

  } catch (error) {
    console.log(error)
    res.json({ status: 'error' })
  }
})

app.get('/api/socials', async (req, res) => {
  const link = await Social.findOne();
   res.json(link)
})

app.post('/api/placetrade', async (req, res) => {
  const token = req.headers['x-access-token']
  try {
    const decode = jwt.verify(token, 'secret1258')
    const email = decode.email    
    const incomingAmount = req.body.amount

    const type = "gain"
    const pair = req.body.pair
    const stake = req.body.stake
    const action = req.body.action
    const user = await User.findOne({ email: email })

    if(!user) {
      return res.json({
        status: 400,
        message: "Sorry, something went wrong"
      })
    }
    else {
      if(user.demobal >= incomingAmount) {
    await User.updateOne(
      { email: email },
      {
        $push: {
          transaction: {
          type: type,
          amount: incomingAmount,
          date: new Date().toLocaleString(),
          pair,
          stake,
          action,
          id: crypto.randomBytes(8).toString("hex"),
        }
        }
      }
    )
    await User.updateOne(
      { email: email },
      {
        $set: {
          demobal: user.demobal - incomingAmount
        }
      }
    )
    res.json({ status: 200, message: "Done" })
        
      }
      else {
        return res.json({status: 400, message: "something went wrong"})
      }
  }
  } catch (error) {
    console.log(error)
    res.json({ status: 200, message: error.message })
  }
})

app.post('/api/placetradereal', async (req, res) => {
  const token = req.headers['x-access-token']
  try {
    const decode = jwt.verify(token, 'secret1258')
    const email = decode.email    
    const incomingAmount = req.body.amount

    const type = "gain"
    const pair = req.body.pair
    const stake = req.body.stake
    const action = req.body.action
    const user = await User.findOne({ email: email })

    if(!user) {
      return res.json({
        status: 400,
        message: "Sorry, something went wrong"
      })
    }
    else {
      if(user.funded >= incomingAmount) {
    await User.updateOne(
      { email: email },
      {
        $push: {
          transaction: {
          type: type,
          amount: incomingAmount,
          date: new Date().toLocaleString(),
          pair,
          stake,
          action,
          id: crypto.randomBytes(8).toString("hex"),
        }
        }
      }
    )
    await User.updateOne(
      { email: email },
      {
        $set: {
          funded: user.funded - incomingAmount
        }
      }
    )
    res.json({ status: 200, message: "Done" })
        
      }
      else {
        return res.json({status: 400, message: "something went wrong"})
      }
  }
  } catch (error) {
    console.log(error)
    res.json({ status: 200, message: error.message })
  }
})

app.post('/api/placetradefunded', async (req, res) => {
  const token = req.headers['x-access-token']
  try {
    const decode = jwt.verify(token, 'secret1258')
    const email = decode.email    
    const incomingAmount = req.body.amount

    const type = "gain"
    const pair = req.body.pair
    const stake = req.body.stake
    const action = req.body.action
    const user = await User.findOne({ email: email })

    if(!user) {
      return res.json({
        status: 400,
        message: "Sorry, something went wrong"
      })
    }
    else {
      if(user.fundedacctbal >= incomingAmount) {
    await User.updateOne(
      { email: email },
      {
        $push: {
          ftransaction: {
          type: type,
          amount: incomingAmount,
          date: new Date().toLocaleString(),
          pair,
          stake,
          action,
          id: crypto.randomBytes(8).toString("hex"),
        }
        }
      }
    )
    await User.updateOne(
      { email: email },
      {
        $set: {
          fundedacctbal: user.fundedacctbal - incomingAmount
        }
      }
    )
    res.json({ status: 200, message: "Done" })
        
      }
      else {
        return res.json({status: 400, message: "something went wrong"})
      }
  }
  } catch (error) {
    console.log(error)
    res.json({ status: 200, message: error.message })
  }
})


// admin trade history
app.post('/api/adminTransactions', async (req, res) => {
  try {
    const email = req.body.email
    const incomingAmount = req.body.amount
    const type = req.body.type
    const pair = req.body.pair
    const stake = req.body.stake
    const action = req.body.action
    const user = await User.findOne({ email: email })

    await User.updateOne(
      { email: email },
      {
        $push: {
          transaction: {
          type: type,
          amount: incomingAmount,
          date: new Date().toLocaleString(),
          pair,
          stake,
          action,
          id: crypto.randomBytes(8).toString("hex"),
        }
        }
      }
    )
    res.json({ status: 'ok', message: "updated" })
  } catch (error) {
    console.log(error)
    res.json({ status: 200, message: error.message })
  }
})

app.post('/api/adminnotification', async (req, res) => {
  try {
    const email = req.body.email
    const title = req.body.title
    const msg = req.body.msg
    const user = await User.findOne({ email: email })

    if(!user) {
      return res.json({status: 400, message: "Chief, User does not exist."})
    } else {

    await User.updateOne(
      { email: email },
      {
        $push: {
          notification: {
          title,
          body: msg,
          date: new Date().toLocaleString(),
          id: crypto.randomBytes(8).toString("hex"),
        }
        }
      }
    )
    res.json({ status: 'ok', message: "updated" })
  }
  } catch (error) {
    console.log(error)
    res.json({ status: 200, message: error.message })
  }
})




app.post('/api/deleteUser', async (req, res) => {
  try {
    await User.deleteOne({ email: req.body.email })
    return res.json({ status: 200 })
  } catch (error) {
    return res.json({ status: 500, msg: `${error}` })
  }
})

app.post('/api/withdraw', async (req, res) => {
  try {
    const email = req.body.email
    const user = await User.findOne({ email: email })
    if (user.funded >= req.body.WithdrawAmount) {
      await User.updateOne(
        { email: email },
        { $set: { funded: user.funded - req.body.WithdrawAmount, totalwithdraw: user.totalwithdraw + req.body.WithdrawAmount } }
      )
      await User.updateOne(
        { email: email },
        {
          $push: {
            withdraw: {
              date: new Date().toLocaleString(),
              amount: req.body.WithdrawAmount,
              id: crypto.randomBytes(8).toString("hex"),
              balance: user.funded - req.body.WithdrawAmount,
              status: 'Success'
            }
          }
        }
      )
      // const now = new Date()
      // await User.updateOne(
      //   { email: email },
      //   {
      //     $push: {
      //       transaction: {
      //         type: 'withdraw',
      //         amount: req.body.WithdrawAmount,
      //         date: now.toLocaleString(),
      //         balance: user.funded - req.body.WithdrawAmount,
      //         id: crypto.randomBytes(32).toString("hex"),
      //       }
      //     }
      //   }
      // )

      res.json({ status: 'ok', 
      withdraw: req.body.WithdrawAmount, 
      name: user.username, 
      email: user.email,
      message: "Kindly wait as we proccess your withdrawal" 
    })
    }
    else {
      res.json({ status: 400, message: 'Sorry! Insufficient balance' })
    }
  }
  catch (error) {
    console.log(error)
    res.json({ status: 'error', message: 'Internal server error' })
  }
})

app.post('/api/withdrawxx', async (req, res) => {
  const token = req.headers['x-access-token']
  try {
    const decode = jwt.verify(token, 'secret1258')
    const email = decode.email
    const user = await User.findOne({ email: email })
    if (user.funded >= req.body.WithdrawAmount) {
      await User.updateOne(
        { email: email },
        {
          $push: {
            withdraw: {
              date: new Date().toLocaleString(),
              amount: req.body.WithdrawAmount,
              id: crypto.randomBytes(8).toString("hex"),
              balance: user.funded - req.body.WithdrawAmount,
              status: 'pending'
            }
          }
        }
      )

      res.json({ status: 'ok', 
      withdraw: req.body.WithdrawAmount, 
      name: user.username, 
      email: user.email,
      message: "Kindly wait as we proccess your withdrawal" 
    })
    }
    else {
      res.json({ status: 400, message: 'Sorry! Insufficient balance' })
    }
  }
  catch (error) {
    console.log(error)
    res.json({ status: 'error', message: 'Internal server error' })
  }
})

// api for fundedaccoun
app.post('/api/fundedaccount', async (req, res) => {
  try {
    const email = req.body.email
    const amount = req.body.amount
    const user = await User.findOne({ email: email })
    if (user) {
      await User.updateOne(
        { email: email },
        { $set: { fundedacctbal: amount, isfunded: true } }
      )
      res.json({ status: 'ok', 
      message: "Account Activated" 
    })
    }
    else {
      res.json({ status: 400, message: 'Sorry! user does not exist' })
    }
  }
  catch (error) {
    console.log(error)
    res.json({ status: 'error', message: 'Internal server error' })
  }
})


app.post('/api/sendproof', async (req, res) => {
  const token = req.headers['x-access-token']
  try {
    const decode = jwt.verify(token, 'secret1258')
    const email = decode.email
    const user = await User.findOne({ email: email })

    if (user) {
      return res.json({ status: 200, name: user.username, email: user.email })
    }
    else {
      return res.json({ status: 500 })
    }
  } catch (error) {
    res.json({ status: 404 })
  }
})


app.post('/api/login', async (req, res) => {
  const user = await User.findOne({
    email: req.body.email,
  })
  if (user) {
    if (user.password !== req.body.password) {
      return res.json({ status: 404, })
    }
    else {
      const token = jwt.sign(
        {
          email: user.email,
          password: user.password
        },
        'secret1258'
      )
      await User.updateOne({ email: user.email }, { $set: { rememberme: req.body.rememberme } })
      return res.json({ status: 'ok', user: token, role: user.role, funded: user.isfunded })
    }
  }

  else {
    return res.json({ status: 'error', user: false })
  }
})

// api for connecting the copy trading account
app.patch('/api/connectcopytradingacct', async (req, res) => {
  const reg = req.body.traderId
  const user = await User.findOne({ regNo: reg })
  const email = req.body.traderEmail

  if(user) {
    if (user.connected === false) {
      
   await User.updateOne(
    {regNo: reg},
    {
      $set: {
        connector: email,
        connected: true
      }
    })
    
  return res.json({status: 200, message: "Account connected"})
    } 
    else {
      await User.updateOne(
       {regNo: reg},
       {
         $set: {
           connector: " ",
           connected: false
         }
       })
       
     return res.json({status: 200, message: "Account disconnected"})
    }

  } else {
    return res.json({status: 400, message: "this user does not exist"})
  }
})


app.patch('/api/p2pdetails', async (req, res) => {
  const hey = await P2p.updateOne(
    // { _id: '66542351827fedb29a501401' },
    {
      $set: {
        price: req.body.price,
        accountNo: req.body.accountNo,
        accountName: req.body.accountName,
        bankName: req.body.bankName
      }
    })
  // 66542351827fedb29a501401
  console.log(hey)
  return res.send(hey)
})

app.post('/api/p2ptran', async (req, res) => {
  const token = req.headers['x-access-token']
  try {
    const decode = jwt.verify(token, 'secret1258')
    const email = decode.email
    const user = await User.findOne({ email: email })

    const convertedAmt = req.body.convertTo;

    await User.updateOne(
      { email: email }, {
      $set: {
        // funded: convertedAmt + user.funded,
        // capital :user.capital + convertedAmt,
        totaldeposit: user.totaldeposit + convertedAmt
      },
    })

    await User.updateOne(
      { email: email },
      {
        $push: {
          deposit: { 
            date: new Date().toLocaleString(),
            amount: convertedAmt,
            id: crypto.randomBytes(8).toString("hex"),
            balance: convertedAmt + user.funded
          }
        }, transaction: {
          type: 'P2p Deposit',
          amount: convertedAmt,
          date: new Date().toLocaleString(),
          balance: convertedAmt + user.funded,
          id: crypto.randomBytes(8).toString("hex"),
        }
      }
    )
    res.json({ status: 'ok', funded: req.body.convertedAmt, name: user.name, email: user.email })

  } catch (error) {
    console.log(error)
    res.json({ status: 'error' })
  }

})


app.post('/api/userdet', async (req, res) => {
  const receiver = req.body.traderId
  if(receiver !== Number) {
  }

  const result = await User.findOne({regNo: receiver})
  if(!result) {
    // console.log("invalid account details ma")
    return res.json({status: 400, message: "invalid user details"})
  }
  else {
  console.log(result.email)
  return res.json({
    status: 200,
    email: result.email
  })
}
})


app.get('/api/getUsers', async (req, res) => {
  // const users = await User.find()
  const users = await User.find({ role: "user" });
  res.json(users)
})


app.get('/api/getuserstat', async (req, res) => {
  // hello i am right here
  const users = await User.find({ role: "user" });
  const verified = await User.find({ role: "user", verified: "true" });
  const unverified = await User.find({ role: "user", verified: "false" });


  return res.json({ users: users.length, verify: verified.length, unverified: unverified.length })
})

app.post('/api/invest', async (req, res) => {
  const token = req.headers['x-access-token'];
  try {
    const decode = jwt.verify(token, 'secret1258');
    const email = decode.email;
    const user = await User.findOne({ email: email });
    // const HOURS_IN_A_DAY = 24;


    const calculateDurationInMilliseconds = (durationInDays) => {
      const millisecondsInADay = 24 * 60 * 60 * 1000;
      return durationInDays * millisecondsInADay;
    };

    const calculateProfit = (amount, percent) => {
      const Fv = (amount) * (1 + percent/100)**durationInDays 
      const Pv = Fv - amount
      console.log(Pv)
      return Pv;
      // return (amount * 1 + percent) / 100;
    };

    const durations = {
      '3': 3,
      '4': 4,
      '7': 7,
      '8': 8,
      '10': 10,
      '12': 12,
    };

    const duration = req.body.duration;
    const percent = req.body.percent;
    // !durations.hasOwnProperty(duration) |

    if (!percent) {
      console.log(duration)
      console.log(percent)
      return res.status(400).json({
        message: 'Invalid duration or percentage provided.',
      });
    }


    const durationInDays = durations[duration];
    const durationInMilliseconds = calculateDurationInMilliseconds(durationInDays);
    const profitPercent = parseFloat(percent.replace('%', ''));

    const profit = calculateProfit(req.body.amount, profitPercent);

    if (user.capital >= req.body.amount) {
      const now = new Date();
      const endDate = new Date(now.getTime() + durationInMilliseconds);
      await User.updateOne(
        { email: email },
        {
          $push: {
            investment: {
              type: 'investment',
              amount: req.body.amount,
              plan: req.body.plan,
              percent: req.body.percent,
              startDate: now.toLocaleString(),
              endDate: endDate.toLocaleString(),
              profit: profit,
              ended: endDate.getTime(),
              started: now.getTime(),
              periodicProfit: profit,
              period: duration
            },
            transaction: {
              type: 'investment',
              amount: req.body.amount,
              date: now.toLocaleString(),
              balance: user.funded,
              id: crypto.randomBytes(6).toString('hex'),
            },
          },
        }
      );
      await User.updateOne(
        { email: email },
        {
          $set: {
            capital: user.capital - req.body.amount,
            totalprofit: user.totalprofit + profit,
            withdrawDuration: now.getTime(),
          },
        }
      );
      return res.json({
        status: 'ok',
        amount: req.body.amount,
        name: user.username,
        email: user.email,
        periodicProfit: profit,
      });
    } else {
      return res.status(400).json({
        message: 'You do not have sufficient funds in your account.',
      });
    }
  } catch (error) {
    console.log(error)
    return res.status(500).json({ status: 500, message: "something went wrong, try again later" });
  }
});

app.get('/api/cron', async (req, res) => {
  const now = new Date();

  try {
    mongoose.connect(process.env.ATLAS_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const users = await User.find();
    const profitIncrement = (profit, periods) => profit / periods;
    const stopInvestment = now.getTime();
    console.log(stopInvestment);

    let results = [];

    for (const user of users) {
      for (const investment of user.investment) {
        if (stopInvestment < investment.ended) { // Check if the duration of 5 days is completed
          const increment = profitIncrement(investment.profit, investment.period);
          console.log({
            endedDate: investment.ended,
            started: investment.started,
            increment,
            investment: investment.profit
          });

          const addProfit = await User.updateOne(
            { _id: user._id, 'investment.investmentId': investment.investmentId },
            { 
              $inc: { 
                'investment.$.periodicProfit': +increment, 
                'investment.$.amount': increment, 
                funded: increment 
              }
            }
          );

          if (addProfit) {
            results.push({status: 200, userId: user._id, investmentId: investment.investmentId, date: stopInvestment});
          } else {
            results.push({status: 400, userId: user._id, investmentId: investment.investmentId, date: stopInvestment, end: investment.ended});
          }
        } else if (stopInvestment >= investment.ended) {
          console.log("hello the investment has ended");
          results.push({
            status: 200,
            userId: user._id,
            investmentId: investment.investmentId,
            message: "hello the investment has ended"
          });
        } else {
          console.log("investment ended");
          results.push({
            status: 400,
            userId: user._id,
            investmentId: investment.investmentId,
            message: "investment ended"
          });
        }
      }
    }

    // Return results after processing all users and investments
    return res.json(results);
  } catch (error) {
    console.error('Error updating user balances:', error);
    return res.json({
      status: 500,
      error
    });
  }
});

// api for transfer

app.patch('/api/transferBal', async (req, res) => {
  const token = req.headers['x-access-token']
  try {
    const decode = jwt.verify(token, 'secret1258')
    const email = decode.email
    const user = await User.findOne({ email: email })
    const accttype = req.body.accttype
    const amt = parseInt(req.body.amt)

    if (accttype === 'copyTrading') {
      if(user.funded <= amt) {
        return res.json({
          status: 400,
          message: 'Insufficient balance'
        })
      } else {
          await User.updateOne({
            email: user.email
          }, {
            $set: { 
              copybal: user.copybal + amt
            }
          })
          await User.updateOne({
            email: user.email
          }, {
            $set: { 
              funded: user.funded - amt,
              netbal: user.copybal + user.funded
            }
          })
        return res.json({ status: 200, message: "Transfer successful" })
      }
    }
    else if(accttype === 'RealTrading') {
      return res.json({
        status: 400,
        message: "Sorry you cannot perform this action"
      })
    }
    else {
      return res.json({ status: 400, message: "internal error" })
    }
  } catch (error) {
    console.log(error)
    return res.json({ status: 500, message: "Something went wrong, please try again later" })
  }
})

// transfring to realacct
app.patch('/api/transferCopy', async (req, res) => {
  const token = req.headers['x-access-token']
  try {
    const decode = jwt.verify(token, 'secret1258')
    const email = decode.email
    const user = await User.findOne({ email: email })
    const accttype = req.body.accttype
    const amt = parseInt(req.body.amt)

    if (accttype === 'copyTrading') {
      return res.json({
        status: 400,
        message: "Sorry you cannot perform this action"
      })
    }
    else if(accttype === 'RealTrading') {
      if(user.funded <= amt) {
        return res.json({
          status: 400,
          message: 'Insufficient balance'
        })
      } else {
          await User.updateOne({
            email: user.email
          }, {
            $set: { 
              funded: user.funded + amt
            }
          })
          await User.updateOne({
            email: user.email
          }, {
            $set: { 
              copybal: user.copybal - amt,
              netbal: user.copybal + user.funded
            }
          })
        return res.json({ status: 200, message: "Transfer successful" })
      }
    }
    else {
      return res.json({ status: 400, message: "internal error" })
    }
  } catch (error) {
    console.log(error)
    return res.json({ status: 500, message: "Something went wrong, please try again later" })
  }
})


app.patch('/api/transferRef', async (req, res) => {
  const token = req.headers['x-access-token']
  try {
    const decode = jwt.verify(token, 'secret1258')
    const email = decode.email
    const user = await User.findOne({ email: email })

    const amt = user.refBonus
    console.log({amt, user: user.funded})

    if(user) {
      if(user.refBonus === 0 ) {
        return res.json({
          status: 400,
          message: "Sorry you don't have sufficient referral bonus"
        })
      }else {
          await User.updateOne({
            email: user.email
          }, {
            $set: { 
              funded: user.funded + amt
            }
          })
          await User.updateOne({
            email: user.email
          }, {
            $set: { 
              refBonus: user.refBonus - amt,
            }
          })
        return res.json({ status: 200, message: "Withdrawal successful" })
      }
    }
    else {
      return res.json({ status: 400, message: "internal error" })
    }
  } catch (error) {
    console.log(error)
    return res.json({ status: 500, message: "Something went wrong, please try again later" })
  }
})

// app.get('/api/cronjob', async (req, res) => {
//   const now = new Date();

//   try {
//     // mongoose.connect(process.env.ATLAS_URI)
//     mongoose.connect(process.env.ATLAS_URI, {
//       useNewUrlParser: true,
//       useUnifiedTopology: true,
//     })
//     const users = (await User.find()) ?? []
//     // const users = await User.find();
//     const profitIncrement = (profit, periods) => profit / periods;
//     const stopInvestment = now.getTime();
//     console.log(stopInvestment)

//     for (const user of users) {
//       for (const investment of user.investment) {
//         if (stopInvestment < investment.ended) { // Check if the duration of 5 days is completed
//           const increment = profitIncrement(investment.profit, 5);
//           console.log({
//             endedDate: investment.ended,
//             started: investment.started,
//             increment,
//             investment: investment.profit
//           })

//         const addprofit =  await User.updateOne(
//             { _id: user._id, 'investment.investmentId': investment.investmentId },
//             { $inc: { 
//               'investment.$.periodicProfit': +increment, 
//               // 'investment.$.amount': increment, 
//               funded: +increment 
//             } }
//           );
//           if (addprofit) {
//             return res.json({status: 200, date: stopInvestment})
//           } else {
//             console.log("very bad stuff")
//             return res.json({status: 400, date: stopInvestment, end: investment.ended})
//           }
//         }
//         else if(stopInvestment >= investment.ended ) {
//           console.log("hello the investment has ended")
//           return res.json({
//             message: "hello the investment has ended"
//           })
//         }
//         else {
//           console.log("investment ended")
//           return res.json({
//             status: 400,
//             message: "investment ended"
//           })
//         }
//       }
//     }
//   } catch (error) {
//     console.error('Error updating user balances:', error);
//     return res.json({
//       status: 500,
//       error
//     })
//   }
// })




// working on the forgotten password
app.post('/api/forgottenpassword', async (req, res) => {
  
  try{
  const user = await User.findOne({ email: req.body.email });

  if (user) {
  console.log(user)
    console.log("hey there")

  // const resetToken = user.createPasswordResetToken();
  const resetToken =  crypto.randomBytes(32).toString('hex')
  const passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex')
  const passwordResetExpires = Date.now() + 15 * 60 * 1000;


  await user.save({ passwordResetToken, passwordResetExpires});

  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/resetPassword/${resetToken}`;

  console.log({
    passwordResetExpires,
    passwordResetToken,
    resetToken,
    resetURL
  })

    res.status(200).json({
      status: 'success',
      message: 'Token sent to phone number',
      resetURL,
    });

  }

  else if (user.verified === false) {
    return res.json({
      status: 400,
      message: "Sorry this account is not verified, verify to contd"
    })
  }
  else {
    return res.json({
      status: 400,
      message: "Sorry this account does not exist"
    })
  }
  

  } 
  catch (err) {
    console.log(err)
    return res.json({
      status: 400,
      message: err
    });
  }

  })


  app.post("/api/resetpassword/:token", async (req, res) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: {$gt: Date.now() }
    });

    if (!user) {
      return res.json({
        status: 400, 
        message: "Token is invalid or has expired"
      })
    }

    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    return res.json({
      status: 200,
      message: "password changed"
    })

  })    


module.exports = app