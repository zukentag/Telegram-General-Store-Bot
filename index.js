require("dotenv").config();
const { Telegraf } = require("telegraf");
const fs = require("fs");
const keep_alive = require('./keep_alive.js')

const express = require('express');
const app = express();

app.use((req, res, next) => {
  if (req.header("x-forwarded-proto") !== "https") {
    res.redirect(`https://${req.header("host")}${req.url}`);
  } else {
    next();
  }
});

app.get('/', (req, res) => {
  res.send('  Server is Active  ;  Bot Link = https://t.me/JMDStore_bot ');
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});



const BOT_TOKEN = "6002971539:AAFgVgD3oCQP35TJWFkEHTgb7eIxLCRVcfM";
const bot = new Telegraf(BOT_TOKEN);

const inventory = require("./inventory.json");
const cart = require("./cart.json");



// Start command handler
bot.command("start", (ctx) => {
  // Send a welcome message to the user
  ctx.reply(
    `Welcome to JMD store! Here are the available commands:\n` +
    `/menu           - View the available items in our inventory\n` +
    `/add               - Add items to cart by specifying name and quantity \n` +
    `/cart               - View the items in your cart\n` +
    `/clear             - Clear items in your cart\n` +
    `/placeorder - Place an order for the items in your cart\n`
  );
});

// menu
bot.command("menu", (ctx) => {
  const message = inventory
    .map((item) => {
      return (
        `Product: ${item.name}\n` +
        `Price: ₹${item.price}\n` +
        `Remaining Quantity: ${item.quantity}\n` +
        `Weight: ${item.weight}\n` +
        `Type: ${item.type}\n` +
        `Brand: ${item.brand}\n`
      );
    })
    .join("\n------------------------------\n\n");

  ctx.reply(message);
});

// add
bot.command("add", (ctx) => {
  const input = ctx.message.text.split(" ");
  const itemName = input
    .slice(1, input.length - 1)
    .join(" ")
    .toLowerCase();
  const quantity = Number(input[input.length - 1]);

  const item = inventory.find((item) => item.name.toLowerCase() === itemName);
  if (!item) {
    ctx.reply("Sorry, this item is not available.");
    return;
  }

  if (item.quantity === 0) {
    ctx.reply(`Sorry, ${itemName} is out of stock.`);
    return;
  }

  const cartItem = cart.find((item) => item.name.toLowerCase() === itemName);
  if (cartItem) {
    if (cartItem.quantity + quantity > item.quantity) {
      ctx.reply(`Sorry, there are not enough ${itemName} in stock.`);
      return;
    }
    cartItem.quantity += quantity;
  } else {
    if (quantity > item.quantity) {
      ctx.reply(`Sorry, there are not enough ${itemName} in stock.`);
      return;
    }
    cart.push({
      name: itemName,
      price: item.price,
      quantity,
      type: item.type,
      brand: item.brand,
    });
  }

  item.quantity -= quantity;

  // update inventory.json
  const inventoryIndex = inventory.findIndex(
    (item) => item.name.toLowerCase() === itemName
  );
  inventory[inventoryIndex] = item;
  fs.writeFileSync("./inventory.json", JSON.stringify(inventory));

  // update cart.json
  fs.writeFileSync("./cart.json", JSON.stringify(cart));

  ctx.reply(`${quantity} ${itemName}(s) have been added to your cart!`);
});

// Cart
bot.command("cart", (ctx) => {
  if (cart.length === 0) {
    ctx.reply("Your cart is empty.");
    return;
  }

  let message = "";
  let totalPrice = 0;

  cart.forEach((item) => {
    const { name, price, quantity } = item;
    const itemPrice = price * quantity;
    totalPrice += itemPrice;

    message += `${name} x ${quantity} - ${itemPrice}\n`;
  });

  message += `Total: ${totalPrice}`;

  ctx.reply(message);
});

// PlaceOrder
bot.command("placeorder", (ctx) => {
  if (cart.length === 0) {
    ctx.reply("Your cart is empty.");
    return;
  }

  // send order details to store owner
  const orderDetails = cart
    .map((item) => `${item.name} x ${item.quantity}`)
    .join("\n");
  const orderTotal = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
  const message = `New order received:\n\n${orderDetails}\n\nTotal: ${orderTotal}`;
  // replace the following line with your code to send message to store owner
  console.log(message);

  // clear cart
  cart.splice(0, cart.length);
  fs.writeFileSync("./cart.json", JSON.stringify(cart));

  ctx.reply("Thank you for your order!");
});

bot.command("clear", (ctx) => {
  // Restore the inventory quantities from the cart
  cart.forEach((cartItem) => {
    const inventoryItem = inventory.find((item) => item.name === cartItem.name);
    if (inventoryItem) {
      inventoryItem.quantity += cartItem.quantity;
    }
  });

  // Clear the cart array
  cart.splice(0, cart.length);
  fs.writeFileSync("./cart.json", JSON.stringify(cart));

  // Update the inventory.json file
  fs.writeFileSync("./inventory.json", JSON.stringify(inventory));

  ctx.reply("Your cart has been cleared and inventory has been updated.");
});

bot.launch();
