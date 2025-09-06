if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}

// check env variables
if (!process.env.SECRET || !process.env.ATLASDB_URL) {
    throw new Error("❌ SECRET or ATLASDB_URL not defined in .env file");
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const MongoStore = require("connect-mongo");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const localStrategy = require("passport-local");

const ExpressError = require("./utils/ExpressError.js");
const Listing = require("./models/listing");
const User = require("./models/user.js");

const listingsRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");

const dbUrl = process.env.ATLASDB_URL;

// --------------------- Mongo Session Store ---------------------
const store = MongoStore.create({
    mongoUrl: dbUrl,
    crypto: {
        secret: process.env.SECRET,
    },
    touchAfter: 24 * 3600, // time period in seconds
});
store.on("error", (err) => {
    console.log("ERROR in MONGO SESSION STORE", err);
});

const sessionOptions = {
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7, // 1 week
        maxAge: 1000 * 60 * 60 * 24 * 7,
        httpOnly: true,
    },
};

// --------------------- MongoDB Connection ---------------------
main()
    .then(() => {
        console.log("✅ Connected to DB");
    })
    .catch((err) => {
        console.log("❌ MongoDB Error:", err);
    });

async function main() {
    await mongoose.connect(dbUrl);
}

// --------------------- EJS & Middlewares ---------------------
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "/public")));

app.use(session(sessionOptions));
app.use(flash());

// --------------------- Passport Auth ---------------------
app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// --------------------- Global Middleware ---------------------
app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
});

// --------------------- Routes ---------------------
app.get("/demouser", async (req, res) => {
    let fakeuser = new User({
        email: "abc@gmail.com",
        username: "delta-student",
    });
    let registeredUser = await User.register(fakeuser, "hello!");
    res.send(registeredUser);
});

app.get("/", (req, res) => {
    res.redirect("/listings");
});

app.use("/listings", listingsRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);

// --------------------- Error Handling ---------------------
app.all("*", (req, res, next) => {
    next(new ExpressError(404, "Page not found"));
});

app.use((err, req, res, next) => {
    let { statusCode = 500 } = err;
    if (!err.message) err.message = "Something went wrong!";
    res.status(statusCode).render("error.ejs", { err });
});

// --------------------- Server ---------------------
app.listen(8080, () => {
    console.log("🚀 Server is listening on port 8080");
});
    


// working...website pr /listing krke access krenge kya ??
