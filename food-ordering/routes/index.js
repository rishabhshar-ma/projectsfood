const express = require('express');
const router = express.Router();
const {sign, verify} = require("jsonwebtoken");
const session = require("express-session");
const connection = require("../connection");

/* *
* * MIDDLEWARE
* */
/* Customer Authorization Middleware... */
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

const authorizeCustomerForPublicViews = (req, res, next) => {
    // console.log(req.cookies);
    let accessToken = req.cookies.customerToken;

    if (!accessToken) {
        req.customerInfo = null;
    }

    try {
        const jwtSecret = "&123@abc#";
        req.customerInfo = verify(accessToken, jwtSecret);
        // next();
    } catch (err) {
        req.customerInfo = null;
    }
    next();
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

router.get("/check-user-loggedIn", (req, res) => {
    // if (session.fullname === undefined) {
    //     res.json({login: false});
    // } else {
    //     res.json({login: true});
    // }

    res.json({login: true});
});

router.get("/check-session-created", (req, res) => {
    if (session.username === undefined) {
        res.redirect("/admin-login");
    } else {
        res.send(session.username);
    }
});

router.get("/test-session", (req, res) => {
    session.username = "John";
    res.send("Session Created.");
});

// ------------------------------------
// ------------------------------------

router.get("/index-2", (req, res) => {
    res.render("index_new");
});


router.get("/check-user-session", (req, res) => {
    if (session.userName === undefined) {
        res.redirect("/user-login");
    } else {
        res.redirect("/checkout");
    }
});

router.post("/user-login", (req, res) => {
    const {username, password} = req.body;

    const loginSQL = `SELECT * FROM users WHERE username=? AND password=?`;
    connection.query(loginSQL, [username, password], (error, data) => {
        if (error) {
            return res.send("error");
        }

        if (data.length === 0) {
            return res.send("invalid");
        }

        const jwtSecret = "&123@abc#"
        const payload = {fullname: data[0].name, mobile: data[0].mobile, userName: username};
        const jwtToken = sign(payload, jwtSecret, {expiresIn: "1d"});

        // Set JWT token in a cookie
        res.cookie('customerToken', jwtToken, {
            maxAge: 24 * 60 * 60 * 1000, // 1 day in milliseconds
            httpOnly: true, // cookie accessible only by the web server
            // secure: true, // Uncomment if using HTTPS
        });

        res.send("success");
    });
});

router.get("/user-login", (req, res) => {
    res.render("user_login", {title: "Login", text: "Account Login"});
});

router.post("/user-signup", (req, res) => {
    try {
        // console.log(req.body);
        const {username, email, name, password, confirm, gender, address, mobile} = req.body;

        if (username === "" || email === "" || name === "" || password === "" || confirm === "" || address === "" || mobile === "") {
            res.send("empty");
        } else if (req.files == null) {
            res.send("photo");
        } else {
            if (password !== confirm) {
                res.send("notMatched");
            } else {
                const selectSQL = `SELECT * FROM users WHERE username=?`;
                connection.query(selectSQL, [username], (e, data) => {
                    if (e) {
                        res.send("error");
                    } else {
                        // console.log(data);
                        if (data.length > 0) {
                            res.send("userExist");
                        } else {
                            let photo = req.files.photo;
                            let serverPath = `public/users/${photo.name}`;
                            let databasePath = `users/${photo.name}`;

                            photo.mv(serverPath, (error) => {
                                if (error) {
                                    res.send("notUploaded");
                                } else {
                                    const insertUser = `INSERT INTO users(username, password, email, name, gender, photo, mobile, address) VALUES(?,?,?,?,?,?,?,?)`;
                                    connection.query(insertUser, [username, password, email, name, gender, databasePath, mobile, address], (err) => {
                                        if (err) {
                                            res.send("error");
                                        } else {
                                            res.send("success");
                                        }
                                    });
                                }
                            });
                        }
                    }
                });
            }
        }
    } catch (e) {
        console.log(e.message);
        res.send("error");
    }
});

function Calculate_GrandTotal(cart) {
    var total = 0;

    for (var item of cart) {
        total += item.discountPrice * item.quantity;
    }

    return total;
}

router.get("/get-products-according-to-sub-category", (req, res) => {
    // console.log(req.query)
    let {id} = req.query;
    id = parseInt(id);
    // console.log(id);
    // var selectSQL = `SELECT products.*, subcategory.subcategory_name, category.category_name FROM products INNER JOIN subcategory ON products.subcategory_id=subcategory.subcategory_id INNER JOIN category ON subcategory.category=category.category_id WHERE id=${id}`;
    var selectSQL = `SELECT products.*, subcategory.subcategory_name, category.category_name FROM products INNER JOIN subcategory ON products.subcategory_id=subcategory.subcategory_id INNER JOIN category ON subcategory.category=category.category_id WHERE products.subcategory_id=${id}`;
    console.log(selectSQL);
    connection.query(selectSQL, (error, rows) => {
        if (error) {
            res.send("error");
        } else {
            res.send(rows);
        }
    });
});

router.get("/get-products", (req, res) => {
    var selectSQL = `select * from products`;
    connection.query(selectSQL, (error, rows) => {
        if (error) {
            res.send("error");
        } else {
            res.send(rows);
        }
    });
});

router.get("/logout-admin", (req, res) => {
    session.adminName = undefined;
    res.send("success");
});

router.post("/user-change-password", (req, res) => {
    var current = req.body.current;
    var newPassword = req.body.newPassword;
    var confirm = req.body.confirmPassword;
    var userName = session.userName;
    var checkOldPassword = `SELECT * FROM users WHERE username="${userName}"`;
    connection.query(checkOldPassword, (error, row) => {
        if (error) {
            res.send("error");
        } else {
            var password = row[0].password;
            if (password !== current) {
                res.send("invalid");
            } else {
                var updateSQL = `UPDATE users SET password="${newPassword}" WHERE username="${userName}"`;
                connection.query(updateSQL, (error) => {
                    if (error) {
                        res.send("error");
                    } else {
                        res.send("updated");
                    }
                });
            }
        }
    });
});

router.post("/admin-change-password", (req, res) => {
    var current = req.body.current;
    var newPassword = req.body.newPassword;
    var confirm = req.body.confirmPassword;
    var email = session.adminEmail;
    var checkOldPassword = `SELECT * FROM admin WHERE email="${email}"`;
    connection.query(checkOldPassword, (error, row) => {
        if (error) {
            res.send("error");
        } else {
            var password = row[0].password;
            if (password != current) {
                res.send("invalid");
            } else {
                var updateSQL = `UPDATE admin SET \`password\`="${newPassword}" WHERE email="${email}"`;
                connection.query(updateSQL, (error) => {
                    if (error) {
                        res.send("error");
                    } else {
                        res.send("updated");
                    }
                });
            }
        }
    });
});

router.get("/admin-change-password", (req, res) => {
    if (session.adminName == undefined) {
        res.redirect("/admin-login");
    } else {
        res.render("admin_change_password", {title: "Change Password", text: "Change Password"});
    }
});

router.get("/admin-home", (req, res) => {
    if (session.adminName == undefined) {
        res.redirect("/admin-login")
    } else {
        res.render("admin_home", {name: session.adminName});
    }
})


router.get("/view-product", (req, res) => {
    var selectProduct = `SELECT * FROM products INNER JOIN subcategory ON products.subcategory_id=subcategory.subcategory_id ORDER BY id DESC`;
    connection.query(selectProduct, (error, rows) => {
        if (error) {
            console.log(error);
            res.send("error");
        } else {
            res.send(rows);
        }
    });
});

router.post("/add-product", (req, res) => {
    var subcategory = req.body.subcategory;
    var productName = req.body.productName;
    var price = req.body.price;
    var discount = req.body.discount;
    var description = req.body.description;
    var photo = req.files.image;
    // console.log(photo);

    var filePath = `public/products/${photo.name}`;
    var databasePath = `products/${photo.name}`;

    photo.mv(filePath, function (error) {
        if (error) {
            console.log(error);
        }
    });

    var insertSQL = `INSERT INTO products(product_name, photo, price, discount, description, subcategory_id) 
                     VALUES("${productName}", "${databasePath}","${price}","${discount}","${description}",${subcategory})`;
    console.log(insertSQL)
    connection.query(insertSQL, (error) => {
        if (error) {
            // console.log(error);
            res.send("error");
        } else {
            res.send("added");
        }
    });
});

router.get("/fetch-subcategory-related-to-category", (req, res) => {
    var categoryid = req.query.category_id;

    var selectSQL = `SELECT * FROM subcategory WHERE category=${categoryid}`;
    connection.query(selectSQL, (error, rows) => {
        if (error) {
            console.log(error);
        } else {
            res.send(rows);
        }
    });
});

router.post("/update-sub-category", (req, res) => {
    var category = req.body.category;
    var subCategory = req.body.subCategory;
    var subCategory_ID = req.body.subCategory_ID;

    var updateSQL = `UPDATE subcategory SET subcategory_name="${subCategory}", category=${category} WHERE subcategory_id=${subCategory_ID}`;
    connection.query(updateSQL, (error) => {
        if (error) {
            res.send("error");
        } else {
            res.send("updated");
        }
    })
})

router.get("/delete-sub-category", (req, res) => {
    var id = req.query.id;

    var deleteSQL = `DELETE FROM subcategory WHERE subcategory_id=${id}`;
    connection.query(deleteSQL, (error) => {
        if (error) {
            res.send("error");
        } else {
            res.send("deleted");
        }
    });
});

router.get("/fetch-sub-category-from-server", (req, res) => {
    var selectSQL = `SELECT * FROM subcategory INNER JOIN category ON subcategory.category=category.category_id ORDER BY subcategory_id DESC`;
    connection.query(selectSQL, (error, rows) => {
        if (error) {
            res.send("error");
        } else {
            res.send(rows);
        }
    });
});


router.post("/update-category", (req, res) => {
    // console.log(req.body);

    var categoryName = req.body.category;
    var categoryID = req.body.category_id;

    var updateSQL = `UPDATE category SET category_name="${categoryName}" WHERE category_id=${categoryID}`;
    connection.query(updateSQL, (error) => {
        if (error) {
            res.send("error");
        } else {
            res.send("updated");
        }
    });
});

router.post("/delete-product", (req, res) => {
    // console.log(req.body);
    var product_id = req.body.product_id;

    var deleteSQL = `DELETE FROM products WHERE id= ${product_id}`;
    connection.query(deleteSQL, (error) => {
        if (error) {
            res.send("error");
        } else {
            res.send("deleted");
        }
    });
});

router.post("/delete-category", (req, res) => {
    // console.log(req.body);

    var catID = req.body.category_id;

    var deleteSQL = `DELETE FROM category WHERE category_id= ${catID}`;
    connection.query(deleteSQL, (error) => {
        if (error) {
            res.send("error");
        } else {
            res.send("deleted");
        }
    });
});

router.get("/get-delivery-boy-from-server", (req, res) => {
    const selectSQL = `SELECT * FROM delivery_boy ORDER BY name ASC`;
    connection.query(selectSQL, (error, rows) => {
        if (error) {
            res.json({error: true, message: error.message, rows: []})
        } else {
            res.json({error: false, message: "", rows: rows})
        }
    });
});

router.get("/get-category-from-server", (req, res) => {
    var selectSQL = `SELECT * FROM category`;
    connection.query(selectSQL, (error, data) => {
        if (error) {
            console.log(error);
            res.send("error");
        } else {
            // console.log(data);
            res.send(data);
        }
    });
});

router.post("/add-delivery-boy", (req, res) => {
    let name = req.body.name;
    let email = req.body.email;
    let mobile = req.body.mobile;
    let insertSQL = `INSERT INTO delivery_boy(name, email, mobile) VALUES("${name}", "${email}", "${mobile}")`;
    connection.query(insertSQL, function (error) {
        if (error) {
            res.json({error: true, message: error.message})
        } else {
            res.json({error: false, message: "Data Added Successfully"})
        }
    });
});

router.get("/about-us", authorizeCustomerForViews, (req, res) => {
    res.render('about', {title: "About Us", customer: req.customerInfo});
});

/* ADMIN routes */
// POST...
router.post("/add-sub-category", (req, res) => {
    const categoryID = req.body.category;
    const subCategory = req.body.subCategory;
    const insertSQL = `INSERT INTO subcategory(subcategory_name, category) VALUES("${subCategory}","${categoryID}")`;
    connection.query(insertSQL, (error) => {
        if (error) {
            res.send("error");
        } else {
            res.send("added");
        }
    });
});

router.post("/add-category", (req, res) => {
    const {category} = req.body;
    const insertSQL = `INSERT INTO category(category_name) VALUES(?)`;
    connection.query(insertSQL, [category], function (error) {
        if (error) {
            console.log(error);
            res.send("error");
        } else {
            res.send("success");
        }
    });
});

// GET...
router.get("/manage-product", (req, res) => {
    if (session.adminName === undefined) {
        res.redirect("/admin-login")
    } else {
        const getCategories = `SELECT * FROM category ORDER BY category_name ASC`;
        connection.query(getCategories, (error, rows) => {
            if (error) {
                console.log(error);
            }
            res.render("products", {category: rows, title: "Manage Menu", text: "Manage Menu"});
        });
    }
});

router.get("/manage-sub-category", (req, res) => {
    if (session.adminName == undefined) {
        res.redirect("/admin-login");
    } else {
        var getCategories = `SELECT * FROM category ORDER BY category_name ASC`;
        connection.query(getCategories, (error, rows) => {
            if (error) {
                console.log(error);
            }
            res.render("sub_category", {category: rows, title: "Manage SubCategory", text: "Manage SubCategory"});
        });
    }
});

router.get("/manage-category", (req, res) => {
    if (session.adminName == undefined) {
        res.redirect("/admin-login")
    } else {
        res.render("category", {title: "Manage Category", text: "Category"});
    }
});

/* ADMIN routes (end) */

/* POST routes */
router.post('/cart-count', authorizeCustomerForPOST, function (req, res) {
    const {userName} = req.customerInfo;
    const checkProductInCart = `SELECT * FROM cart WHERE username=?`;
    connection.query(checkProductInCart, [userName], (e, records) => {
        if (e) {
            console.log(e.message);
            return res.send("0");
        }

        res.send(records.length.toString());
    });
});

router.post("/add-to-cart", authorizeCustomerForPOST, (req, res) => {
    const {userName} = req.customerInfo;

    // console.log(req.body);
    // console.log(req.body.productObject);
    const {action} = req.body;
    // console.log("action -", action);

    // let cartArray = [];

    // if (session.cart !== undefined) {
    //     cartArray = session.cart;
    // }

    /* ADD TO CART */
    if (action === "add") {
        const productObject = JSON.parse(req.body.productObject);
        const {id, product_name, price, discount, description, photo} = productObject;

        const discountPrice = Math.round(price - (price * discount) / 100);

        const checkProductInCart = `SELECT * FROM cart WHERE product_id=? AND username=?`;
        connection.query(checkProductInCart, [id, userName], (e, record) => {
            if (e) {
                console.log(e.message);
                return res.send("error");
            }

            if (record.length === 0) { // if no product in cart table...
                let quantity = 1
                const saveProductInCart = `Insert Into cart(product_id, quantity, username) Values(?,?,?)`;
                connection.query(saveProductInCart, [id, quantity, userName], (e, records) => {
                    if (e) {
                        console.log(e.message);
                        return res.send("error");
                    }

                    res.send("success");
                });
            } else { // if product exists in cart table, then update the quantity of the current product...
                let quantity = record[0].quantity + 1
                const updateQuantityInCart = `Update cart Set quantity=? WHERE product_id=? AND username=?`;
                connection.query(updateQuantityInCart, [quantity, id, userName], (e) => {
                    if (e) {
                        console.log(e.message);
                        return res.send("error");
                    }

                    res.send("success");
                });
            }
        });
    }
    /*
    Quantity Update
    */
    else if (action === "plus" || action === "minus") {
        const {pid} = req.body;

        const checkProductInCart = `SELECT * FROM cart WHERE product_id=? AND username=?`;
        connection.query(checkProductInCart, [pid, userName], (e, record) => {
            if (e) {
                console.log(e.message);
                return res.send("error");
            }

            let quantity;
            if (action === "plus") {
                if (record[0].quantity < 5) {
                    quantity = record[0].quantity + 1;
                } else {
                    return res.send("updated");
                }
            } else {
                if (record[0].quantity > 1) {
                    quantity = record[0].quantity - 1;
                } else {
                    return res.send("updated");
                }
            }

            let updateQuantity = `Update cart Set quantity=? WHERE product_id=? AND username=?`;
            connection.query(updateQuantity, [quantity, pid, userName], (e, record) => {
                if (e) {
                    console.log(e.message);
                    return res.send("error");
                }
                res.send("updated");
            });
        });
    }
    /*
    Remove product
    */
    else if (action === "remove") {
        const {pid} = req.body;
        const removeItem = `Delete From cart Where product_id=? AND username=?`;
        connection.query(removeItem, [pid, userName], (e) => {
            if (e) {
                console.log(e.message);
                return res.send("error");
            }

            res.send("removed");
        })
    }
    /*
    Cart Count
    */
    else if (action === "cartCount") {
        const checkProductInCart = `SELECT * FROM cart WHERE username=?`;
        connection.query(checkProductInCart, [userName], (e, records) => {
            if (e) {
                console.log(e.message);
                return res.send("0");
            }

            res.send(records.length.toString());
        });
    }
    /*
    Get Products
    */
    else if (action === "get-products") {
        const checkProductInCart = `SELECT * FROM cart INNER JOIN products ON cart.product_id=products.id WHERE username=?`;
        connection.query(checkProductInCart, [userName], (e, records) => {
            if (e) {
                console.log(e.message);
                return res.send([]);
            }

            res.send(records);
        });
    }
    /* ---- */
    else {
        res.send("");
        // if (session.cart !== undefined) {
        //     res.send(session.cart);
        // } else {
        //     // res.send([]);
        //     res.send("");
        // }
    }
});

router.post("/admin-login", (req, res) => {
    try {
        const {email, password} = req.body;

        const loginSQL = `SELECT * FROM admin WHERE email=? AND password=?`;
        connection.query(loginSQL, [email, password], (error, data) => {
            if (error) {
                console.log(error.message)
                return res.send("error");
            }

            if (data.length === 0) {
                return res.send("invalid");
            }

            session.adminEmail = email;
            session.adminName = data[0].name;
            res.send("success");
        });
    } catch (e) {
        console.log(e.message)
        return res.send("error");
    }
});

/* POST routes (end) */

/* GET routes */
router.get("/checkout", authorizeCustomerForViews, (req, res) => {
    const {userName} = req.customerInfo;

    const checkItemExistInCart = `Select * From cart Where username=?`;
    connection.query(checkItemExistInCart, [userName], (e, records) => {
        if (records.length === 0) {
            return res.redirect("/shopping-cart")
        }

        const getAddress = `SELECT address FROM users WHERE username=?`;
        connection.query(getAddress, [userName], (e, row) => {
            res.render("checkout", {
                title: "Order Checkout",
                text: "Order Checkout",
                address: row[0].address,
                customer: req.customerInfo
            });
        });
    });
});

router.get("/shopping-cart", authorizeCustomerForViews, (req, res) => {
    res.render("shopping-cart", {title: "Your Cart", text: "Your Cart", customer: req.customerInfo});
});

router.get("/menu", authorizeCustomerForViews, (req, res) => {
    res.render("menu", {title: "Menu", text: "Menu", customer: req.customerInfo});
});

router.get("/user-signup", authorizeCustomerForPublicViews, (req, res) => {
    res.render("user_signup", {title: "Create Account", text: "Register", customer: req.customerInfo});
});

router.get("/admin-login", (req, res) => {
    res.render("admin_login", {title: "Admin Login", text: "Admin Login"});
});

router.get('/contact', authorizeCustomerForPublicViews, (req, res) => {
    res.render('public/contact', {title: "Contact", text: "Contact Us", customer: req.customerInfo});
});

router.get('/about', authorizeCustomerForPublicViews, (req, res) => {
    res.render('public/about', {title: "About", text: "About Us", customer: req.customerInfo});
});

router.get('/', authorizeCustomerForPublicViews, (req, res) => {
    // console.log("customerInfo -", req.customerInfo)
    res.render('index', {title: "Home", text: "", customer: req.customerInfo});
});

module.exports = router;
