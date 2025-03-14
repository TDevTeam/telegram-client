import './lib/bot.js';
import * as Manager from './lib/Manager.js';

await Manager.setupFromFile();

for (const account of Manager.getAccounts()) {
    // crazy
}