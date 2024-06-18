const express = require('express');
const session = require("express-session");
const router = express.Router();
const {verify} = require("jsonwebtoken");
const connection = require("../connection");

/* *
* * MIDDLEWARE
* */

/* Admin Authorization Middleware... */
const authorizeCustomerForViews = (req, res, next) => {
    // console.log(req.cookies);
    let accessToken = req.cookies.customerToken;

    if (!accessToken) {
        return res.redirect("/user-login");
    }

    try {
        const jwtSecret = "&123@abc#";
        req.customerInfo = verify(accessToken, jwtSecret);
        next();
    } catch (err) {
        return res.redirect("/user-login");
    }
}

const authorizeCustomerForPOST = (req, res, next) => {
    // console.log(req.cookies);
    let accessToken = req.cookies.customerToken;

    if (!accessToken) {
        return res.send("jwt");
    }

    try {
        const jwtSecret = "&123@abc#";
        req.customerInfo = verify(accessToken, jwtSecret);
        next();
    } catch (err) {
        return res.send("jwt");
    }
}

/* ------------------------------------------------------ */

router.get("/cancel-order", (req, res) => {
    let {id} = req.query;
    let updateSQL = `UPDATE orders SET order_status="Cancelled" WHERE id=${id}`;
    connection.query(updateSQL, (err) => {
        if (err) {
            return res.send("error");
        }
        res.send("success");
    });
});

router.get("/fetch-my-order", authorizeCustomerForPOST, (req, res) => {
    let {userName} = req.customerInfo;
    let pendingOrders = `SELECT *, DATE_FORMAT(date_time, "%W %M %e %Y %r") as date_time  FROM orders WHERE username=?`;
    connection.query(pendingOrders, [userName], (error, data) => {
        if (error) {
            res.send("error");
        } else {
            res.send(data);
        }
    });
});

/* POST routes... */
router.post("/place-new-order", authorizeCustomerForPOST, (req, res) => {
    try {
        const {grandTotal, address, remarks, payment_mode} = req.body;
        const {userName} = req.customerInfo;

        let remarks_2 = null;
        if (remarks !== "") {
            remarks_2 = `"${remarks}"`;
        }

        let payment_status = "Pending";
        if (payment_mode === "Online") {
            payment_status = "Paid";
        }


        /* insert into bill table... */
        let orderSQL = `INSERT INTO orders(grand_total, payment_mode, address, remarks, order_status, username, payment_status) 
                    VALUES("${grandTotal}", "${payment_mode}", "${address}", ${remarks_2}, "Pending", "${userName}", "${payment_status}")`;
        connection.query(orderSQL, (error, record) => {
            if (error) {
                console.log(error.message)
                return res.send("error");
            }

            const order_id = record.insertId;
            let counter = 1;

            /* get data from cart table of current user... */
            let getCartData = `SELECT * FROM cart INNER JOIN products ON cart.product_id=products.id Where cart.username=?`;
            connection.query(getCartData, [userName], (error, cart) => {
                if (error) {
                    console.log(error.message)
                    return res.send("error");
                }

                let cartLength = cart.length;

                for (let i = 0; i < cartLength; i++) {
                    let {id, quantity, price, discount} = cart[i];

                    let discount_amount = parseInt(price) * parseInt(discount) / 100;
                    let discounted_price = parseInt(price) - discount_amount;

                    /* insert multiple rows into order details table... */
                    let billDetails = `Insert Into order_details(price, discount, discounted_price, quantity, product_id, order_id) Values(?,?,?,?,?,?)`;
                    connection.query(billDetails, [price, discount, discounted_price, quantity, id, order_id], (error) => {
                        if (error) {
                            console.log(error.message)
                            return res.send("error");
                        }

                        if (counter === cartLength) {
                            /* empty cart table for the current customer... */
                            const deleteCart = `Delete From cart Where username=?`;
                            connection.query(deleteCart, [userName], (error) => {
                                if (error) {
                                    console.log(error.message)
                                    return res.send("error");
                                }

                                res.send("success");
                            })
                        }

                        counter++;
                    })
                }
            });
        });
    } catch (e) {
        console.log(e.message)
        res.send("error");
    }
});

/* GET routes... */
router.get("/thank-you", authorizeCustomerForViews, (req, res) => {
    res.render("users/thank_you", {title: "Thank You", text: "Thank You", customer: req.customerInfo});
});

router.get("/logout", authorizeCustomerForViews, (req, res) => {
    res.clearCookie('customerToken');  // Clear the JWT token cookie
    res.redirect("/user-login")
});

router.get("/change-password", authorizeCustomerForViews, (req, res) => {
    res.render('users/change_password', {title: "Change Password", text: "Change Password"});
});

router.get("/order-details", authorizeCustomerForViews, (req, res) => {
    if (!req.query.order_id) {
        return res.redirect("/users/my-orders")
    }

    const {order_id} = req.query;
    const {userName} = req.customerInfo;

    let checkOrderExists = `SELECT * FROM orders WHERE id=? AND username=?`;
    connection.query(checkOrderExists, [order_id, userName], (error, record) => {
        if (error) {
            console.log(error.message)
            return res.send("error");
        }

        if (record.length === 0) {
            return res.redirect("/users/my-orders")
        }

        let readDetails = `SELECT order_details.*, products.product_name, products.photo FROM order_details INNER JOIN products ON order_details.product_id=products.id WHERE order_details.order_id=${order_id}`;
        connection.query(readDetails, [order_id, userName], (error, records) => {
            if (error) {
                console.log(error.message)
                return res.send("error");
            }

            res.render("users/my_orders_details", {title: "Order Details", text: "Order Details", records});
        });
    });
});

router.get("/my-orders", authorizeCustomerForViews, (req, res) => {
    res.render("users/my_orders", {title: "My Orders", text: "My Orders"});
});

router.get('/', authorizeCustomerForViews, function (req, res, next) {
    const {userName, fullname} = req.customerInfo
    res.render('users/user_home', {username: fullname, title: "User Dashboard", text: "User Dashboard"});
});

module.exports = router;
