const debug = require("debug")("app:routes:index");

const encryption = require("@module/encryption");
const { x } = require("@module/test");

/*
const db = new (require("conf"))({
  configName: "db",
  cwd: "./"
}); //
*/

module.exports = app => {
  /*
   ** Controller
   */
  const controller = new class {
    constructor(app) {
      this.app = app;
    }

    async socket(socket, io, clients) {
      socket.on("announce", (meta, cb) => {
        debug("announce", clients);

        cb(clients);
      });
    }

    foo() {
      return 'foo'
    }

    async get(req, res, next) {
      //
      try {
        res.render("pages/index", {
          x: x(),
          foo: this.foo(),
          globals: {
            socket_clients: this.app.get("socket_clients"),
            token: encryption.hash("sha512", "123").toString('hex'),
            payment: {}
          }
        });
      } catch (err) {
        return next(err);
      }
    }
  }(app);

  /*
   ** Router & Routes
   */
  const { Router } = require("express");
  const router = Router();

  // GET /[options.apiPath [/options.apiVersion]]/
  router.get("/", (...args) => controller.get(...args));

  return {
    controller: controller,
    router: router
  };
};
