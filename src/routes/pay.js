const debug = require("debug")("app:routes:index");

const cardstream = require("@module/cardstream");

const db = new (require("conf"))({
  configName: "db",
  cwd: "./"
});

/*
db.set("unicorn", "🦄");
console.log(db.get("unicorn"));
//=> '🦄'

// Use dot-notation to access nested properties
db.set("foo.bar", true);
console.log(db.get("foo"));
//=> {bar: true}

db.delete("unicorn");
console.log(db.get("unicorn"));
*/
//

module.exports = app => {
  /*
   ** Controller
   */
  const controller = new class {
    constructor(app) {
      this.app = app;
    }

    async socket(socket, io, clients) {
      // socket.on("announce", (meta, cb) => {
      //   debug("announce", clients);
      //   cb(clients);
      // });
    }

    isValidEmail(str) {
      var regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
      return regex.test(String(str).toLowerCase());
    }
    /**
     *
     */
    async postWebhook(req, res, next) {
      try {
        db.set("cardstream_webhook", req.body);

        // signature check
        if (!cardstream.verifySignature(req.body)) {
          return res.json({
            error: "invalid signature"
          });
        }

        return res.json({});
      } catch (err) {
        debug(err.status, err.message);
        return next(err);
      }
    }
    /**
     *
     */
    async postVerify(req, res, next) {
      //
      try {
        db.set("cardstream", req.body);

        // signature check
        if (!cardstream.verifySignature(req.body)) {
          console.log(
            "invalid signature, the reason for making this script..."
          );
        }

        res.render("pages/index", {
          globals: {
            socket_clients: this.app.get("socket_clients"),
            payment: req.body
          }
        });
      } catch (err) {
        debug(err.status, err.message);
        return next(err);
      }
    }

    /**
     *
     */
    async post(req, res, next) {
      try {
        let errors = {};

        //
        if (!req.body.firstName) {
          errors.firstName = "required field";
        }

        if (!req.body.lastName) {
          errors.last_name = "required field";
        }

        if (!req.body.email) {
          errors.email = "required field";
        } else if (!this.isValidEmail(req.body.email)) {
          errors.email = "invalid email";
        } else {
          // check email not already in use etc...
        }

        //
        if (!req.body.address_1) {
          errors.address_1 = "required field";
        }

        if (!req.body.town) {
          errors.town = "required field";
        }

        if (!req.body.county) {
          // errors.county = "required field";
        }

        if (!req.body.country) {
          errors.country = "required field";
        }

        if (!req.body.postcode) {
          errors.postcode = "required field";
        }

        //
        if (!req.body.tos_agree) {
          errors.tos_agree = "you must accept our terms of service";
        }

        if (Object.keys(errors).length) {
          return res.json({
            errors: errors,
            values: req.body
          });
        }

        // amount
        let amount = 0;
        for (let i in req.body.basket) {
          amount = amount + req.body.basket[i].amount;
        }
        amount = amount * 100;

        // line item
        let lineItemName = [];
        for (let item in req.body.basket) {
          lineItemName.push(req.body.basket[item].name);
        }
        lineItemName = lineItemName.join(", ");

        //
        let orderRef =
          req.body.basket.length +
          " item" +
          (req.body.basket.length > 1 ? "s" : "") +
          " [" +
          lineItemName +
          "]";

        // set baseURL, trusting codesandbox.io's proxy :/
        // - its better to use: ${req.protocol}://${req.hostname} if you can.
        let baseURL =
          req.headers["x-scheme"] + "://" + req.headers["x-forwarded-host"];

        // create transacton request
        let transaction = {
          merchantID: cardstream.merchantID,
          merchantName: "Cardstream Test",
          merchantWebsite: "https://cardstream.com",
          amount: amount,
          type: 1,
          action: "SALE",
          orderRef: orderRef,
          transactionUnique: cardstream.transactionUnique(),
          redirectURL: baseURL + "/pay/verify",
          callbackURL: baseURL + "/pay/webhook",
          currencyCode: 826,
          countryCode: 826,
          //
          customerMerchantRef: req.body.user_id || 0,
          customerName: (
            (req.body.firstName || "") +
            " " +
            (req.body.lastName || "")
          ).trim(),
          customerEmail: req.body.email || "",
          customerAddress: [
            req.body.address_1 || "",
            req.body.address_2 || "",
            req.body.town || "",
            req.body.county || ""
          ].join("\n"),
          customerPostcode: req.body.postcode || "",
          //
          cardNumber: req.body.card.number || "",
          cardCVV: req.body.card.cvv || "",
          cardExpiryMonth: req.body.card.expiry[0] || "",
          cardExpiryYear: req.body.card.expiry[1] || ""
        };

        // sign the transacton
        const signedTransaction = await cardstream.sign(transaction);

        // record transaction, so can reference and verify it on redirect/callback
        db.set("transaction." + signedTransaction.signature, {
          status: "initial", // initial, success|fail
          createdDate: new Date(),
          ...signedTransaction.data,
          signature: signedTransaction.signature,
          basket: req.body.basket
        });

        //
        res.json({
          success: true,
          errors: {},
          transaction: {
            ...signedTransaction.data,
            signature: signedTransaction.signature
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

  // [POST] /pay
  router.post("/pay", (...args) => controller.post(...args));
  router.post("/pay/verify", (...args) => controller.postVerify(...args));
  router.post("/pay/webhook", (...args) => controller.postWebhook(...args));

  return {
    controller: controller,
    router: router
  };
};
