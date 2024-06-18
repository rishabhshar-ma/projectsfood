var express = require('express');
var router = express.Router();
const session = require("express-session");
const connection = require("../connection");

function isAdminLoggedIn(req, res, next) {
    if (session.adminName === undefined) {
        res.redirect("/admin-login");
    } else {
        next();
    }
}

/* ------------------------------------------ */
/* ------------------------------------------ */

router.get("/fetchDeliveryBoys", (req, res) => {
    let getDelBoy = `SELECT * FROM delivery_boy WHERE status='Available'`;
    connection.query(getDelBoy, (e, rows) => {
        if (e) {
            res.json({error: true, message: e.message, rows: []})
        } else {
            res.json({error: false, message: "", rows: rows})
        }
    })
})

router.get("/manage-delivery-boy", isAdminLoggedIn, (req, res) => {
        res.render("admin/delivery-boy", {title: "Manage Delivery Boy", text: "Delivery Boy"});
    }
);

router.post("/deliver-order-now", (req, res) => {
    // console.log(req.body);
    var name = req.body.name;
    var oid = req.body.oid;

    var shipOrder = `UPDATE orders SET person_received="${name}", order_status="Delivered", payment_status="Complete" WHERE id=${oid}`;
    connection.query(shipOrder, (error) => {
        if (error) {
            res.send("error");
        } else {
            res.send("success");
        }
    });
});

router.post("/assign-delivery-boy-to-order", (req, res) => {
    // console.log(req.body);
    let deliveryBoy = req.body.deliveryBoy;
    let order_id = req.body.order_id;
    let shipOrder = `UPDATE orders SET delivery_boy="${deliveryBoy}", order_status="Assigned" WHERE id=${order_id}`;
    connection.query(shipOrder, (error) => {
        if (error) {
            console.log(error.message);
            res.send("error");
        } else {
            let updateDB_Status = `UPDATE delivery_boy SET status='Assigned' WHERE id='${deliveryBoy}'`;
            connection.query(updateDB_Status, (error) => {
                if (error) {
                    console.log(error.message);
                    res.send("error");
                } else {
                    res.send("success");
                }
            });
        }
    });
});

router.post("/ship-order-now", (req, res) => {
    // console.log(req.body);
    var company = req.body.company;
    var trackID = req.body.trackID;
    var url = req.body.url;
    var oid = req.body.oid;

    var shipOrder = `UPDATE orders SET tracking_id="${trackID}", company_name="${company}", tracking_url="${url}", order_status="Shipped" WHERE id=${oid}`;
    connection.query(shipOrder, (error) => {
        if (error) {
            res.send("error");
        } else {
            res.send("success");
        }
    });
});

router.get("/fetch-delivered-order", (req, res) => {
    // var pendingOrders = `SELECT *, DATE_FORMAT(date_time, "%W %M %e %Y %r") as date_time  FROM orders WHERE order_status = "Delivered"`;
    var pendingOrders = `SELECT orders.*, DATE_FORMAT(orders.date_time, "%W %M %e %Y %r") as date_time, users.name, users.mobile, users.email FROM orders INNER JOIN users ON orders.username=users.username WHERE orders.order_status="Delivered"`;

    connection.query(pendingOrders, (error, data) => {
        if (error) {
            res.send("error");
        } else {
            res.send(data);
        }
    });
});

router.get("/deliver-food-now/:order_id/:db_id", (req, res) => {
    let {order_id, db_id} = req.params;
    let deliverOrder = `UPDATE orders SET order_status='Delivered', payment_status='Paid' WHERE id=${order_id}`;
    connection.query(deliverOrder, (error) => {
        if (error) {
            res.json({error: true, message: error.message});
        } else {
            let changeDeliveryBoyStatus = `UPDATE delivery_boy SET status='Available' WHERE id=${db_id}`;
            connection.query(changeDeliveryBoyStatus, (error) => {
                if (error) {
                    res.json({error: true, message: error.message});
                } else {
                    res.json({error: false, message: "Order Status Updated"})
                }
            })
        }
    });
})

router.get("/getSingleDBInfo/:db_id", (req, res) => {
    // console.log(req.params)
    let {db_id} = req.params;
    let fetchDBInfo = `SELECT * FROM delivery_boy WHERE id=${db_id}`;
    connection.query(fetchDBInfo, (error, row) => {
        if (error) {
            res.json({error: true, message: error.message, row: {}})
        } else {
            res.json({error: false, message: "", row: row[0]})
        }
    });
})

router.get("/fetch-shipped-order", (req, res) => {
    // var pendingOrders = `SELECT *, DATE_FORMAT(date_time, "%W %M %e %Y %r") as date_time  FROM orders WHERE order_status = "Shipped"`;
    var pendingOrders = `SELECT orders.*, DATE_FORMAT(orders.date_time, "%W %M %e %Y %r") as date_time, users.name, users.mobile, users.email FROM orders INNER JOIN users ON orders.username=users.username WHERE orders.order_status="Assigned"`;
    connection.query(pendingOrders, (error, data) => {
        if (error) {
            res.send("error");
        } else {
            res.send(data);
        }
    });
});

router.get("/fetch-pending-order", (req, res) => {
    const pendingOrders = `SELECT orders.*, DATE_FORMAT(orders.date_time, "%W %M %e %Y %r") as date_time, users.name, users.mobile, users.email FROM orders INNER JOIN users ON orders.username=users.username WHERE orders.order_status = "Pending" Order By id DESC`;
    connection.query(pendingOrders, (error, data) => {
        if (error) {
            res.send("error");
        } else {
            res.send(data);
        }
    });
});

router.get("/delivered-orders", (req, res) => {
    // if (session.adminName == undefined) {
    //     res.redirect("/admin-login");
    // } else {
    res.render("admin/delivered_order", {title: "Delivered Orders", text: "Delivered Orders"});
    // }
});

router.get("/assigned-orders", isAdminLoggedIn, (req, res) => {
    res.render("admin/shipped_orders", {title: "Manage Assigned Orders", text: "Assigned Orders"});
});

router.get("/order-details", isAdminLoggedIn, (req, res) => {
    const {id} = req.query;
    const orderDetails = `SELECT * FROM order_details INNER JOIN products ON order_details.product_id=products.id WHERE order_id=${id}`;
    connection.query(orderDetails, (error, records) => {
        if (error) {
            return res.render("admin/order_details", {title: "Order Details", text: "Order Details", records: []});
        }
        res.render("admin/order_details", {title: "Order Details", text: "Order Details", records});
    });
});

router.get("/pending-orders", isAdminLoggedIn, (req, res) => {
    res.render("admin/manage_orders", {title: "Manage Pending Orders", text: "Pending Orders"});
});

module.exports = router;