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



let db = new sqlite3.Database(dbPath , (err) => {
    if (err) {
        return console.error(err.message);
    }
    console.log('Connected to the in-memory SQLite database.');
});

db.serialize(function() {
    db.run('CREATE TABLE goldPerPerson(player_id INTEGER PRIMARY KEY, gold_amount INTEGER , date_refill DATE);', function(err) {
        if(err) {
            return console.log(err.message);
        } else {
            console.log('Table created')
        }
    })
})

client.once('ready' , () => {
    console.log('Bot is Ready!');
    // console.log(Math.random()); 0.09086973396358555 -> Float com 17 casas. (.toFixed(n) com n casas)
})

client.on('message', message => {
    let str = message.content;
    let op = message.author;
    console.log(message.content);
    // Working has Intended
    if(message.content.startsWith(`/balance`)) {   
        accountBalance(op.id);
    }
    // Working has Intended
    if(message.content.startsWith(`/refill`)) {
       db.all(`SELECT * FROM goldPerPerson WHERE player_id = ?` , [op.id] , (err, rows) => {
            if(err) {
                return console.error(err.message);
            }
            console.log(rows);
            if(rows && (todayDate() - rows[0].date_refill) == 0) {
                message.channel.send("<@" + op.id + "> Your account just got refilled with your daily 200g");
                refill(op.id);
            } else {
                message.channel.send("<@" + op.id + "> Your daily cooldown is still active");
            }
        })
    }
    // Working has Intended
    if(message.content.startsWith(`/login`)) {
        createAccount(op , message);
    }
    if(message.content.startsWith(`${prefix}`)) {
        let opponent = message.mentions.members.first(); //Verificar as rows
        let amount = Math.floor(parseInt(str.slice(6)));
        db.all(`SELECT * FROM goldPerPerson WHERE player_id = ? or player_id = ?`, [op,opponent] , (err,rows) => {
            if (err) {
                console.log(err.message);
            }
            if(rows) {
                console.log(rows);
                let goldX = rows[0].gold_amount;
                let goldZ = rows[1].gold_amount;
                if(goldX >= amount && goldZ >= amount) { //subdividir isto em funções
                    message.channel.send("<@" + opponent.id + "> do you accept this bet ?");
                    //Resposta-Request
                    let counter = 0;
                    let bettingPool = amount*10;
                    let filter = m => (m.content.includes(`/answer`) && m.author == opponent.id) || (m.content.toString() == '/roll' && m.author == (counter % 2 == 0 ? op : opponent));
                    let collector = new Discord.MessageCollector(message.channel, filter);
                    collector.on('collect' , (message, col) =>{
                        opponent = message.author;
                        if(message.content.includes(`/answer`)) {
                            message.channel.send("Please roll the dice...");
                        }
                        console.log("Collected message: " + message.content);
                        if(message.content.includes(`/roll`)) {
                            message.channel.awaitMessages(filter , { 
                            time: 1000
                            }).then(collected => {
                            counter++;
                            bettingPool = getRandomMinMax(1,bettingPool,getLength(bettingPool));
                            if(bettingPool > 1) {
                                message.channel.send("Player " + "<@" + message.author.id + "> just rolled : " + bettingPool);
                            } else {
                                message.channel.send("Player " + "<@" + message.author.id + "> has lost!");
                                let winner = (message.author != op) ? opponent : op;
                                transaction(winner,message.author,amount,message);
                                collector.stop();
                            }
                        })
                        .catch(error => {
                            counter = 0;
                            bettingPool = 0;
                            message.channel.send("Game cancelled");
                        })
                    }
                })
                } else {
                    message.channel.send("You don't have enough money");
                }
            }
        })
        //console.log(message.author.username + ": " + str.slice(1));
        /*let amount = Math.floor(parseInt(str.slice(6)));
        if(goldByID(op.id) > amount) {
        message.channel.send("<@" + opponent.id + "> do you accept this bet ?");
            //Resposta-Request
            let counter = 0;
            let bettingPool = amount*10;
            let filter = m => (m.content.includes(`/answer`) && m.author == opponent.id) || (m.content.toString() == '/roll' && m.author == (counter % 2 == 0 ? op : opponent));
            let collector = new Discord.MessageCollector(message.channel, filter);
            collector.on('collect' , (message, col) =>{
                opponent = message.author;
                if(message.content.includes(`/answer`)) {
                    message.channel.send("Please roll the dice...");
                }
                console.log("Collected message: " + message.content);
                if(message.content.includes(`/roll`)) {
                    message.channel.awaitMessages(filter , { 
                    time: 1000
                    }).then(collected => {
                    counter++;
                    bettingPool = getRandomMinMax(1,bettingPool,getLength(bettingPool));
                    if(bettingPool > 1) {
                        message.channel.send("Player " + "<@" + message.author.id + "> just rolled : " + bettingPool);
                    } else {
                        message.channel.send("Player " + "<@" + message.author.id + "> has lost!");
                        let winner = (message.author != op) ? opponent : op;
                        transaction(winner,message.author,amount,message);
                        collector.stop();
                    }
                })
                .catch(error => {
                    counter = 0;
                    bettingPool = 0;
                    message.channel.send("Game cancelled");
                })
            }
        })
        } else {
            message.channel.send("You don't have enough money");
        }*/
    }
})

function getLength(value){
    return value.toString().length;
}

function getRandomMinMax(min,max,length){
min = Math.ceil(min);
max = Math.floor(max);
return Math.floor(Math.random().toFixed(length) * (max - (min + 1))) + min;  
}

//Not tested , probably doesn't work
function transactions(winner,loser,amount,message) {
    db.run(`UPDATE goldPerPerson SET gold_amount = gold_amount + ? WHERE player_id = ?` , [winner.id,amount] , function(err) {
        if(err) {
            return console.error(err.message);
        }
    })
    db.run(`UPDATE goldPerPerson SET gold_amount = gold_amount - ? WHERE player_id = ?` , [loser.id,amount] , function(err) {
        if(err) {
            return console.error(err.message);
        }
    })
    message.channel.send('Transaction concluded!')
    return;
}
//Working has Intended
function todayDate() {
    let today = new Date();
    let time = today.getTime();
    //let dd = String(today.getDate()).padStart(2, '0');
    //let mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    //let yyyy = today.getFullYear();
    //today = mm + '/' + dd + '/' + yyyy;
    return Math.floor((time/86400000) - (today.getTimezoneOffset()/1440) + 2440587.5);
}
//Working has Intended
function createAccount(player,message) {
    console.log("CREATING ACCOUNT")
    db.run(`INSERT INTO goldPerPerson(player_id,gold_amount,date_refill) VALUES(?,?,?)`, [player.id, 200 ,todayDate()] , (err,rows) => {
        if(err) {
            console.log("erro no create account");
            return console.error(err.message);
        } else {
        console.log(rows);
        message.channel.send("<@" + player + "> your account was created.");
        }
    })
}
//Working has Intended
function refill(player) {
        db.all(`UPDATE goldPerPerson SET gold_amount = gold_amount + ? , date_refill = ? WHERE player_id = ?` , [200, todayDate() ,player] , (err, rows) => {
            if(err) {
                return console.error(err.message);
                console.log("erro no primeiro");
            }
            console.log(rows);
            if(rows) {
                console.log("Your account just got refilled with your daily 200g");
            }
        })
}

//Working has Intended
function accountBalance(player) {
    db.all(`SELECT * FROM goldPerPerson WHERE player_id = ?`, [player], (err, rows) => {
        if(err) {
            console.log("erro no get money");
            return console.error(err.message);
        }
        console.log(rows)
        if(rows) {
            console.log("YOUR BALANCE IS : " + rows[0].gold_amount)
        }
    }) 
}

client.login(token);