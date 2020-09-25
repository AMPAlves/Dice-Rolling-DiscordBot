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
const sqlW = `UPDATE goldPerPerson SET gold_amount = gold_amount + ? WHERE player_id = ?`;
const sqlL = `UPDATE goldPerPerson SET gold_amount = gold_amount - ? WHERE player_id = ?`;



let db = new sqlite3.Database(dbPath , (err) => {
    if (err) {
        return console.error(err.message);
    }
    console.log('Connected to the in-memory SQLite database.');
});

db.serialize(function() {
    db.run('CREATE TABLE goldPerPerson(player_id INTEGER PRIMARY KEY, gold_amount INTEGER , date_refill DATE);',function(err) {
        if(err) {
            return console.log(err.message);
        } else {
            console.log('Table created')
        }
    })
})

client.once('ready' , () => {
    console.log('Bot is Ready!')
    // console.log(Math.random()); 0.09086973396358555 -> Float com 17 casas. (.toFixed(n) com n casas)
})

client.on('message', message => {
    let str = message.content;
    let op = message.author;
    console.log(message.content);
    if(message.content.startsWith(`/getmoney`)) {   
        console.log("GETTING MONEY")
        db.all(`SELECT * FROM goldPerPerson WHERE player_id = ?`, [op.id], (err, rows) => {
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
    if(message.content.startsWith(`/refill`)) {
        createAccount(op);
        refill(op);
    }
    if(message.content.startsWith(`${prefix}`)) {
        let opponent = message.mentions.members.first();
        //console.log(message.author.username + ": " + str.slice(1));
        let amount = Math.floor(parseInt(str.slice(6)));
        if(goldByID(op) > amount) {
        message.channel.send("<@" + opponent.id + "> do you accept this bet ?" );
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
            message.channel.send("You don't have enough money" );
        }
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

function goldByID(owner) {
    let gold = 0;
    db.run(sql, [owner.id] , (err,row) => {
        if (err) {
            console.log(err.message);
        }
        if(row) {
            console.log(row.gold_amount);
            gold = row.gold_amount;
        }
    })
    return gold;
}

function transactions(winner,loser,amount,message) {
    db.run(sqlW , [winner.id,amount] , function(err) {
        if(err) {
            return console.error(err.message);
        }
    })
    db.run(sqlL , [loser.id,amount] , function(err) {
        if(err) {
            return console.error(err.message);
        }
    })
    message.channel.send('Transaction concluded!')
    return;
}
function todayDate() {
    let today = new Date();
    let dd = String(today.getDate()).padStart(2, '0');
    let mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    let yyyy = today.getFullYear();
    today = mm + '/' + dd + '/' + yyyy;
    return today;
}

function createAccount(player) {
    console.log("CREATING ACCOUNT")
    db.run(`INSERT INTO goldPerPerson(player_id,gold_amount,date_refill) VALUES(?,?,?)`, [player.id, 200 ,todayDate()] , function(err) {
        if(err) {
            console.log("erro no create account");
            return console.error(err.message);
        }
    })
    return ;
}


function refill(player) {
        db.run(`UPDATE goldPerPerson SET gold_amount = gold_amount + ? , date_refill = ? WHERE player_id = ?;` , [200, todayDate() ,player.id] , function(err) {
            if(err) {
                return console.error(err.message);
                console.log("erro no primeiro");
            }
        })
    return console.log("Dinheiro introduzido");
}

client.login(token);
