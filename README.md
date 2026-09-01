# TIENDA DC Bot

Premium Telegram digital-store starter bot with a simplified admin panel.

## Railway setup

1. Deploy this repository as a Node.js service.
2. Set the environment variables `BOT_TOKEN`, `ADMIN_ID`, and `SUPPORT_USERNAME`.
3. Railway will run `npm start`.

## Local setup

```bash
npm install
npm start
```

## Admin

Send `/admin` from the configured `ADMIN_ID`.

The admin panel includes dashboard, products, stock, orders, users, broadcast, and settings.

## Stock

Products can contain one stock item per line. Orders automatically deliver the next stock item after a wallet purchase.

## Note

This version uses local `data.json` storage. For long-term production use, PostgreSQL or another persistent database is recommended.
