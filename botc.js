const Discord = require('discord.js')
const axios =require('axios');
const ToneAnalyzer = require('ibm-watson/tone-analyzer/v3');
const { IamAuthenticator } = require('ibm-watson/auth');
require('dotenv').config()
const client = new Discord.Client()
const prefix='!'

client.on('message', async message => {
    // Prevent bot from responding to its own messages
    if (message.author.bot||!message.content.startsWith(prefix)) {
        return 
    }
    const args = message.content.slice(prefix.length).split(/ +/);
    const command = args.shift().toLowerCase();
    var mentions=message.mentions.members.first();
    if(command==='help')
    {
        const HelperEmbed = new Discord.MessageEmbed()
        .setColor('#F33209')
        .setAuthor(message.member.user.tag)
        .setTitle("Commands")
        .addFields(
            { name: '!stock', value: 'Use: `!stock <insert ticker symbol>`\n'+
                'Displays values based in 1 min intervals'}, 
            { name: '!tone', value: 'Use: `!tone`, or `!tone <@user>` for other users\n'+
               'Tones based on past 10 messages\n'+ 
               'Only messages without attachments/custom emojis used'},
        )
        .setTimestamp();
        message.channel.send(HelperEmbed)
    }
    if(command==='stock')
    {
        var symbol=args[0];
        var key=process.env.apikey;
        var url='https://api.twelvedata.com/time_series?&interval=1min&outputsize=1&source=docs&symbol='+symbol+key;
        Stock(url);
        async function Stock(url) {
            try {
                const response = await axios.get(url);
                if(response.data.status=='error')
                {
                    throw new Error(response.data.code+"\n"+response.data.message)
                }
                else
                {
                    var vals=response.data.values[0];
                    const StockEmbed = new Discord.MessageEmbed()
                   .setColor('#0099ff')
                   .setAuthor(message.member.user.tag)
                   .setTitle(response.data.meta.symbol.toString())
                   .setDescription(JSON.stringify(vals,null,2).replace(/[{}\"]/g, ""))
                   .setThumbnail('https://upload.wikimedia.org/wikipedia/en/c/c9/Charging_Bull_statue.jpg')
                   .setTimestamp()
                    message.channel.send(StockEmbed);
                }
            } 
            catch (error) {
              message.channel.send(error.toString())
            }
        }
    }
    if(command==='tone')
    {
            var mcontent=[];
            client.channels.cache.get(message.channel.id).messages.fetch({ limit: 100})
            .then(function(messagec)
            {
                var fil;
                if(mentions!=null && !mentions.user.bot)
                {
                    fil=messagec.filter(m=>
                        {
                            return m.author.id==mentions.id
                        })
                }
               else
               {
                 fil = messagec.filter(m=>
                    {
                        return m.author.id==message.author.id
                    });
                }
                if(fil.array().length<11) 
                {
                    throw new Error("Not enough messages for analysis")
 
                }
                ar=fil.array();
                var user_data=ar[1].author.username+'#'+ar[1].author.discriminator
                var j=10;
                for(var i=0;i<ar.length;i++)
                {      
                    if((ar[i].content.match(/<?(a)?:?(\w{2,32}):(\d{17,19})>?/)==null) && (ar[i].embeds.length==0) && (ar[i].attachments.size==0))
                    { 
                        if(j>=1)
                        {
                            mcontent[i]=ar[j--].content  
                               
                        }              
                    }
                }
                tone(mcontent,user_data);
            })
            .catch(error=>
            {
                message.channel.send(error.toString());
            })
        
        function tone(content_a,username)
        {
            const toneAnalyzer = new ToneAnalyzer({
            version: '2017-09-21',
            authenticator: new IamAuthenticator({
                apikey: process.env.apikey_t,
            }),
            url: process.env.website,
            });
            const text = JSON.stringify(content_a,null, 2);
            const toneParams = {
            toneInput: { 'text': text },
            contentType: 'application/json;charset=utf-8',
            };

            toneAnalyzer.tone(toneParams)
            .then(toneAnalysis => {
                var data=toneAnalysis.result.document_tone.tones;
                if(data.length!=0)
                {
                    var cont=[];
                    message.channel.send('Tones and Scores');
                    for(var x=0;x<data.length;x++)
                    {
                       var emote;
                        switch(data[x].tone_name)
                        {
                            case "Sadness":
                            emote=':pensive: '
                            break;
                            case "Anger":
                            emote=':rage: '
                            break;
                            case "Tentative":
                            emote=':confused: '
                            break;
                            case "Analytical":
                            emote=':thinking: '
                            break;
                            case "Joy":
                            emote=':smiley: '
                            break;
                            case "Fear":
                            emote=':fearful: '
                            break;
                            case "Confident":
                            emote=':sunglasses: '
                            break;
                        }
                        cont[x]=emote+data[x].tone_name+': '+data[x].score
                    }
 
                   const exampleEmbed = new Discord.MessageEmbed()
                   .setColor('#0099ff')
                   .setAuthor(username)
                   .setTitle('Tones')
                   .setDescription(cont.join('\r\n'))
                   .setThumbnail('https://upload.wikimedia.org/wikipedia/commons/9/92/P_culture_yellow.png')
                   .setTimestamp()
 
                    message.channel.send(exampleEmbed);
                }
                else
                {
                    message.channel.send('There are no dominant tones detected at the document level')
                }
            })
            .catch(err => {
                message.channel.send(err.toString());
            });
        }
    }  
    
 
})
client.login(process.env.token)