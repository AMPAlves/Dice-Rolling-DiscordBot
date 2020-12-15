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

// Not working gotta find out tomorrow
const gameEmbed = new Discord.MessageEmbed()
.setColor('#FDB813')
.setTitle('Deathrolling Stravaganza')
.setThumbnail('https://ectunnel.com/images/wowgold.png')
//Description muda
//addFields mudam
.setTimestamp(2000)
.setFooter('This bot is rolling up right now','https://ectunnel.com/images/wowgold.png');
                                        


//Working as Intended
let db = new sqlite3.Database(dbPath , (err) => {
    if (err) {
        return console.error(err.message);
    }
    console.log('Connected to the in-memory SQLite database.');
});

//Working as Intended
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
    //

    updateGold(200, 254702881725349900, 183394900576960513);
})

client.on('message', message => {
    let str = message.content;
    let op = message.author;
    console.log(message.content);
    //Working as Intended
    if(message.content.startsWith(`/balance`)) {   
        accountBalance(op.id,message);
    }
    //Working as Intended
    if(message.content.startsWith(`/refill`)) {
       db.all(`SELECT * FROM goldPerPerson WHERE player_id = ?` , [op.id] , (err, rows) => {
            if(err) {
                return console.error(err.message);
            }
            console.log(rows);
            if(rows && (todayDate() - rows[0].date_refill) > 0) {
                message.channel.send("<@" + op.id + "> Your account just got refilled with your daily 200g");
                refill(op.id);
            } else {
                message.channel.send("<@" + op.id + "> Your daily cooldown is still active");
            }
        })
    }
    //Working as Intended
    if(message.content.startsWith(`/login`)) {
        createAccount(op , message);
    }
    if(message.content.startsWith(`${prefix}`)) {
        let opponent = message.mentions.members.first(); //Verificar as rows
        let amount = Math.floor(parseInt(str.slice(6)));
        db.all(`SELECT * FROM goldPerPerson WHERE player_id = ?`, [op.id] , (err,rows) => {
            if (err) {
                console.log(err.message);
            }
            if(rows) {
                message.channel.send('EU DESEJO MORRER : ' + op.id);
                console.log(rows);
                let goldX = rows[0].gold_amount;
                db.all('SELECT * FROM goldPerPerson WHERE player_id = ?' , [opponent.id] , (err,rows) => {
                    if(err) {
                        console.log(err.message);
                    }
                    if(rows) {
                        console.log(rows);
                        let goldY = rows[0].gold_amount;
                        if(goldX >= amount && goldY >= amount) { //subdividir isto em funções
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
                                let gameStatus = false;
                                /* Tenho que tratar desta parte do código , o que eu quero fazer é :
                                Ele fazer o roll seguido , mas de 2 em 2 , ou , de 3 em 3 mudar a embeded message com o novo valor da aposta
                                */
                               let counter = 0;
                               while(!gameStatus) {
                                    let messagePlayer = (counter % 2 == 0) ? op : opponent;
                                    let winner = (messagePlayer != op) ? op : opponent;
                                    bettingPool = getRandomMinMax(1,bettingPool,getLength(bettingPool));
                                    message.channel.send('Player' + '<@' + messagePlayer + '> just rolled : ' + bettingPool);
                                    if(bettingPool == 1) {
                                        message.channel.send('Player' + '<@' + messagePlayer + '> has lost!');
                                        // REFAZER ESTA MERDA
                                        //
                                        updateGold(amount, winner, messagePlayer);
                                        message.channel.send('Transaction concluded!');
                                        gameStatus = true;
                                        collector.stop();
                                    }
                                    counter++;
                                    /*.catch(error => {
                                        counter = 0;
                                        bettingPool = 0;
                                        message.channel.send("Game cancelled");
                                        gameStatus = true;
                                    })*/
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
function getLength(value){
    return value.toString().length;
}
//Working as Intended
function getRandomMinMax(min,max,length){
min = Math.ceil(min);
max = Math.floor(max);
return Math.floor(Math.random().toFixed(length) * (max - (min + 1))) + min;  
}
//Working as Intended
function todayDate() {
    let today = new Date();
    let time = today.getTime();
    return Math.floor((time/86400000) - (today.getTimezoneOffset()/1440) + 2440587.5);
}
//Working as Intended
function createAccount(player,message) {
    console.log("CREATING ACCOUNT")
    db.run(`INSERT INTO goldPerPerson(player_id,gold_amount,date_refill) VALUES(?,?,?)`, [player.id, 1000 ,todayDate()] , (err,rows) => {
        if(err) {
            console.log("erro no create account");
            return console.error(err.message);
        } else {
        console.log(rows[0]);
        message.channel.send("<@" + player + "> your account was created with 1000g");
        }
    })
}
//Working as Intended
function refill(player) {
        db.all(`UPDATE goldPerPerson SET gold_amount = gold_amount + ? , date_refill = ? WHERE player_id = ?` , [1000, todayDate() ,player] , (err, rows) => {
            if(err) {
                return console.error(err.message);
            }
            console.log(rows[0]);
            if(rows) {
                console.log("Your account just got refilled with your daily 200g");
            }
        })
}

//Working as Intended
function accountBalance(player , message) {
    db.all(`SELECT * FROM goldPerPerson WHERE player_id = ?`, [player], (err, rows) => {
        if(err) {
            console.log("erro no get money");
            return console.error(err.message);
        }
        console.log(rows)
        if(rows) {
            message.channel.send("Your balance is : " + rows[0].gold_amount)
        }
    }) 
}




function updateGold(amount, winner, messagePlayer) {

    console.log(amount + " " + winner + " " + messagePlayer);
    // db.all(`UPDATE goldPerPerson SET gold_amount = gold_amount + ? WHERE player_id = ?` , [amount,winner] , (err,rows) => {
    //     if(err) {
    //         return console.error(err.message);
    //     }
    //     console.log(rows);
    //     if(rows) {
    //         // message.channel.send("winner & winner.id = " + winner + " & " + winner.id );
    //         // message.channel.send("Your account just won " + amount + "g.");
    //         db.all(`UPDATE goldPerPerson SET gold_amount = gold_amount + ? WHERE player_id = ?` , [-amount,messagePlayer] , (err,rows) => {
    //             if(err) {
    //                 return console.error(err.message);
    //             }
    //             console.log(rows);
    //             if(rows) {
    //                 // message.channel.send("messagePlayer & messagePlayer.id = " + messagePlayer + " & " + messagePlayer.id );
    //                 // message.channel.send("Your account just lost " + amount + "g.");
    //             }
    //         })
    //     }
    // })
    // db.all(`UPDATE goldPerPerson SET gold_amount = gold_amount + ? , date_refill = ? WHERE player_id = ?` , [1000, todayDate() ,254702881725349900], (err, rows) => {

    //         if(err) {
    //             return console.error(err.message);
    //         }
    //         console.log(rows);
    //         if(rows) {
    //             console.log("Your account just got refilled with your daily 200g");
    //         }
    // })
    
    let n = 254702881725349900
    db.all(`update goldPerPerson set gold_amount = gold_amount + ? where player_id = ?` , [amount, n.toString()] , (a, rows) => { 
        console.log(a)
        console.log(rows)
        db.all(`select * from goldPerPerson` , (a, rows) => { 
            console.log(a)
            console.log(rows)

        })

    })

}



client.login(token);
