const Discord = require('discord.js');
const { prefix, token } = require('./config.json');
const client = new Discord.Client();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'database.db')
const minDice = 1;
// Database consts
const sqlID = `SELECT player_id FROM goldPerPerson WHERE player_id = ?`;
const sql = `SELECT gold_amount FROM goldPerPerson WHERE player_id = ?`;

//Working as Intended
let db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        return console.error(err.message);
    } else {
    console.log('Connected to the in-memory SQLite database.');
    }
});

//Working as Intended
db.serialize(function () {
    db.run('CREATE TABLE goldPerPerson(player_id TEXT PRIMARY KEY, gold_amount INTEGER , date_refill DATE);', function (err) {
        if (err) {
            return console.log(err.message);
        } else {
            console.log('Table goldPerPerson was created')
        }
    })
    db.run('CREATE TABLE gamesPlayed(player_id TEXT PRIMARY KEY, roundsWon INTEGER, roundsLost INTEGER);', function (err) {
        if (err) {
            return console.log(err.message);
        } else {
            console.log('Table gamesPlayed was created')
        }
    })
})

client.once('ready', () => {
    console.log('Bot is Ready!');
})

client.on('message', message => {
    let str = message.content;
    let msgAuthor = message.author;
    console.log(message.content);
    //Working as Intended
    if (message.content.startsWith(`/balance`)) {
        accountBalance(msgAuthor.id, message);
    }
    //Working as Intended
    if (message.content.startsWith(`/refill`)) {
        db.all(`SELECT * FROM goldPerPerson WHERE player_id = ?`, [msgAuthor.id], (err, rows) => {
            if (err) {
                return console.error(err.message);
            }
            console.log(rows);
            if (rows && (todayDate() - rows[0].date_refill) > 0) {
                message.channel.send("<@" + msgAuthor.id + "> Your account just got refilled with your daily 200g");
                refill(msgAuthor.id);
            } else {
                message.channel.send("<@" + msgAuthor.id + "> Your daily cooldown is still active");
            }
        })
    }
    //Working as Intended
    if (message.content.startsWith(`/login`)) {
        createAccount(msgAuthor, message);
    }
    //Working as Intended
    if (message.content.startsWith(`/luck`)) {
        winrate(msgAuthor, message);
    }
    //Working as Intended
    if (message.content.startsWith(`${prefix}`)) {
        let opponent = message.mentions.members.first();
        let amount = Math.floor(parseInt(str.slice(6)));
        db.all(`SELECT * FROM goldPerPerson WHERE player_id = ?`, [msgAuthor.id], (err, rows) => {
            if (err) {
                console.log(err.message);
            }
            if (rows) {
                console.log(rows);
                let goldX = rows[0].gold_amount;
                db.all('SELECT * FROM goldPerPerson WHERE player_id = ?', [opponent.id], (err, rows) => {
                    if (err) {
                        console.log(err.message);
                    }
                    if (rows) {
                        console.log(rows);
                        let goldY = rows[0].gold_amount;
                        if (goldX >= amount && goldY >= amount) {
                            message.channel.send("<@" + opponent.id + "> do you accept this bet ?");
                            //Resposta-Request
                            let counter = 0;
                            let bettingPool = amount * 10;
                            let filter = m => (m.content.includes(`/answer`) && m.author == opponent.id);
                            let collector = new Discord.MessageCollector(message.channel, filter);
                            collector.on('collect', (message, col) => {
                                opponent = message.author;
                                console.log("Collected message: " + message.content);
                                let gameStatus = false;
                                let counter = 0;
                                while (!gameStatus) {
                                    let messagePlayer = (counter % 2 == 0) ? opponent : msgAuthor;
                                    let winner = (messagePlayer != msgAuthor) ? msgAuthor : opponent;
                                    bettingPool = getRandomMinMax(1, bettingPool, getLength(bettingPool));
                                    message.channel.send('Player' + '<@' + messagePlayer + '> just rolled : ' + bettingPool);
                                    if (bettingPool == 1) {
                                        message.channel.send('Player' + '<@' + messagePlayer + '> lost!');
                                        updateGold(amount, winner, messagePlayer);
                                        message.channel.send('Transaction concluded & stats updated!');
                                        gameStatus = true;
                                        collector.stop();
                                    }
                                    counter++;
                                }
                            })
                        } else {
                            message.channel.send("You don't have enough money");
                        }
                    }
                })
            }
        })
    }
})

//Working as Intended
function getLength(value) {
    return value.toString().length;
}

//Working as Intended
function getRandomMinMax(min, max, length) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random().toFixed(length) * (max - (min + 1))) + min;
}

//Working as Intended
function todayDate() {
    let today = new Date();
    let time = today.getTime();
    return Math.floor((time / 86400000) - (today.getTimezoneOffset() / 1440) + 2440587.5);
}

//Working as Intended
function createAccount(player, message) {
    console.log("CREATING ACCOUNT")
    db.all(`INSERT INTO goldPerPerson(player_id,gold_amount,date_refill) VALUES(?,?,?)`, [player.id, 500, todayDate()], (err, rows) => {
        if (err) {
            console.log("erro no create account");
            return console.error(err.message);
        } else {
            message.channel.send("<@" + player + "> your account was created with 500g");
        }
    })
    db.all(`INSERT INTO gamesPlayed(player_id,roundsWon,roundsLost) VALUES(?,?,?)`, [player.id,0, 0], (err, rows) => {
        if (err) {
            console.log("erro no create account");
            return console.error(err.message);
        }
    })
}

//Working as Intended
function refill(player) {
    db.all(`UPDATE goldPerPerson SET gold_amount = gold_amount + ? , date_refill = ? WHERE player_id = ?`, [200, todayDate(), player], (err, rows) => {
        if (err) {
            return console.error(err.message);
        }
        console.log(rows[0]);
        if (rows) {
        }
    })
}

//Working as Intended
function winrate(player,message) {
    db.all(`SELECT * FROM gamesPlayed WHERE player_id = ?`, [player.id], (err, rows) => {
        if (err) {
            return console.error(err.message);
        }
        console.log(rows[0]);
        if (rows) {
            let winrate = (rows[0].roundsLost == 0) || (rows[0].roundsLost + rows[0].roundsWon == 0) ? (rows[0].roundsWon/1) * 100 : (rows[0].roundsWon / rows[0].roundsLost) * 100;
            message.channel.send("Current winrate : " + winrate + "%");
        }
    })
}

//Working as Intended
function accountBalance(player, message) {
    db.all(`SELECT * FROM goldPerPerson WHERE player_id = ?`, [player], (err, rows) => {
        if (err) {
            console.log("erro no get money");
            return console.error(err.message);
        }
        console.log(rows)
        if (rows) {
            message.channel.send("Your balance is : " + rows[0].gold_amount)
        }
    })
}

//Working as Intended
function updateGold(amount, winner, loser) {
    db.all(`UPDATE goldPerPerson SET gold_amount = gold_amount + ? WHERE player_id = ?`, [amount, winner.id], (err, rows) => {
        if (err) {
            return console.error(err.message);
        }
        if (rows) {
            db.all(`UPDATE gamesPlayed SET roundsWon = roundsWon + ? WHERE player_id = ?`, [1,winner.id], (err, rows) => {
                if(err) {
                    return console.error(err.message);
                }
            })
        }
    })

    db.all(`UPDATE goldPerPerson SET gold_amount = gold_amount - ? WHERE player_id = ?`, [amount, loser.id], (err, rows) => {
        if (err) {
            return console.error(err.message);
        }
        if (rows) {
            db.all(`UPDATE gamesPlayed SET roundsLost = roundsLost + ? WHERE player_id = ?`, [1,loser.id], (err, rows) => {
                if(err) {
                    return console.error(err.message);
                }
            })
        }
    })
}

client.login(token);