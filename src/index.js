require("dotenv").config();

//
const debug = require("debug")("app:entrypoint");
const path = require("path");

//
try {
  // Express
  const app = require("@module/express")({
    publicPath: path.join(__dirname, "public")
  });

  // Socket.io (not used yet)
  app.socket = require("@module/socket.io")(app);

  /*
   ** Enable route controllers
   */
  app.addRoutes(["index"]);

  /*
   ** Error handler
   */
  app.express.use((err, req, res, next) => {
    //
    debug(err.stack);

    //
    res.status(500).json({
      message: err.message,
      name: err.name,
      fatal: err.fatal,
      errno: err.errno,
      code: err.code
    });
  });

  /*
   ** Listen
   */
  app.listen(process.env.PORT || 8080, err => {
    if (err) throw err;
    debug(
      "Server started",
      "http://" +
        (process.env.HOST || "localhost") +
        ":" +
        (process.env.PORT || 8080)
    );
  });
} catch (e) {
  console.error(e);
}
