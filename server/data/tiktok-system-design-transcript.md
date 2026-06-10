# TikTok System Design Transcript

## Introduction

- Interviewer: Design TikTok. Hey everyone, I am here today with Adam, and today we will be doing a mock system design interview. I am really excited to have Adam in this video. Adam, do you mind just introducing yourself and telling us a little bit about what you work on?
- Candidate: Sure. Hi, my name is Adam. I work on cloud engineering and back-end systems, currently at Oracle, but I will be moving over to Google soon.
- Interviewer: Awesome. We are really excited to jump into a practice system design interview today.

## Question

- Interviewer: The question that we will be doing is: design TikTok.
- Candidate: Okay, cool. Design TikTok. This is fun. I actually have never used TikTok.

## Clarifying questions

- Candidate: Great. Maybe we can start by quickly, if you could give me, I have an idea, obviously I know what it is, but if you could just give me a quick overview of what we are looking for and maybe be a little bit specific on the portion of TikTok we are wanting to focus on.
- Interviewer: Awesome. High-level overview of TikTok is that it is a mobile app for video sharing between users. The basic idea is that you are able to upload a video to TikTok, and then you are able to view a feed of videos. You see one video at a time, you scroll up, you see the next video. You can follow users, so you see the videos that they post, and then you can also perform actions on those videos, like favoriting them or commenting on them. I think those are the basic things we will want to support.
- Candidate: Cool. All right, that makes sense. I am sorry, I am just going to take a minute and jot down some notes real quick.
- Interviewer: Sounds great. In the meantime, I will switch over and screen share here into our whiteboard.
- Candidate: Cool. It looks like TikTok is a mobile app. If it is okay with you, I think I am just going to focus on the back-end infrastructure and not so much go into the mobile app portion, just because I think there is a little bit more feature-rich detail there in the back-end system.
- Interviewer: Yeah, sounds great.
- Candidate: From what I can see, the first thing I want to dive into is these functional requirements. When I say functional requirements, I mean the top-level buckets of work that we are wanting to look into.
- Candidate: The first thing, from what you explained to me, was upload videos. A user from their mobile device, or really in theory, since we are just dividing the device and the back end, if it is okay I am going to assume that we are just going to create an API that is client-agnostic and that is going to accept user data to upload videos.
- Candidate: We are going to think of section one here, if I were writing this up, these functional requirements. Number one here is upload videos. When we upload videos, these videos are sort of time-boxed, right? It is sort of the same way as Instagram, where they are only about 15 seconds each. Is that right?
- Interviewer: Yeah. We can assume they are 30 seconds to maybe a maximum of a minute long.
- Candidate: Okay, so max one minute. Cool. I am also assuming that if I am uploading videos, would there also be text associated with that? Is it sort of like with Instagram or Facebook, where you can upload a photo, but you can also tag and add text and things like that?
- Interviewer: Yeah, that is a good question. Let's assume you can add a comment or caption to it. We do not need to get into the details of tagging and how that would work, but yeah, maybe some text data associated with it.
- Candidate: Okay, cool. Upload, I deleted what I was writing here. Upload, so let's say video plus text. Cool.
- Candidate: Then number two here, what I am thinking is, you said view feed. When I think about viewing the feed, what we are doing is we are aggregating videos. Correct me if I am wrong, are we talking about aggregating videos from people I follow only? Is it people I follow plus, I know that TikTok has this special algorithm that they use to grab recommended videos. Would it be kind of like, can I assume there is a mixture of those two things?
- Interviewer: Yeah, I think that is a good question. For simplicity, we could focus maybe on videos of people you follow, but I would be interested in hearing about how you would create a trending or video recommendation as well.
- Candidate: For the purposes of this, do you want me to include an ability for me to comment, like videos, as part of that functionality?
- Interviewer: Yeah, let's try to build out how we would favorite videos and maybe follow particular creators.
- Candidate: Okay, cool. That is actually my next functional requirement here, which is follow users. So favoriting, following, commenting, forwarding, I do not know if they allow that, but I will just bucket that as a sort of video interaction endpoint.
- Interviewer: Sure.

## Answer

- Candidate: Cool. That covers these as the general functional requirements. Really quickly, I just want to talk about these non-functional requirements. By non-functional, what I mean is availability, latency, and scale.
- Candidate: It sounds to me like, I am going to make an assumption here, that this needs to be a highly available system, simply because of the scale of the users that are going to be using it. It sounds like it is going to be a lot, and because it is serving videos, it does need to be highly available. I am going to say roughly 99.999 availability, if that sounds about right to you.
- Interviewer: Yeah, that sounds great.
- Candidate: There are always these trade-offs. When I am thinking about how I am going to design a system, I am trying to understand if it is not super high, if maybe it does not need to be as highly available, maybe there are certain things we can do to balance our budget and how we are going to budget for compute resources and that sort of thing.
- Candidate: Also, think about latency. One good thing is, from the sound of it, since it is a mobile device, it sounds like we can cache a lot of the content on the device itself. When we initially pull stuff, we will be able to get the top-level stuff really quickly, but after that we can be pulling stuff in the background. It sounds like we have a little bit of leeway there. Does that sound about right to you?
- Interviewer: Yeah, that sounds good. I think maybe later on we can talk a little bit about the latency, or how this would differ across different features, like upload versus download, and how to think about that.
- Candidate: Yeah, okay. I will just put TBD for that.

## Requirements

- Candidate: Cool. We have upload videos, view feed, follow users, and video interactions like favorites, likes, comments, and maybe forwarding.
- Candidate: Upload videos means user data plus a video. Videos are about 30 seconds to a maximum of one minute long. They can include some text, like a comment or caption, but we are not getting into details like tagging.
- Candidate: For view feed, we are probably aggregating videos from people the user follows. For simplicity, we can focus on that, but we can also talk about trending or recommendations.
- Candidate: For video interactions, I am thinking of a user activity endpoint, or something in that area, that will record following, favoriting, likes, and similar actions.
- Candidate: Non-functional requirements are high availability, latency, and scale. It needs to be highly available, around 99.999, and latency can be improved by caching content on the device and preloading content in the background.
- Candidate: Scale is the next thing to clarify. Can you give me a rough estimate on users? If we are talking about users, do you have any idea how many users we are talking about here in a day?

## Scale

- Interviewer: Yeah, in a day, let's say we want to support a million active users in a day.
- Candidate: Okay, so a million daily active users. Cool.
- Candidate: I am going to do a couple of estimates here now that we are talking about this. This gives me an idea of how I am going to store everything. We said max for the videos was about one minute. I am going to make a quick assumption and say that a minute of compressed H.264 video is about five megabytes. Does that sound about right to you?
- Interviewer: I think it sounds reasonable.
- Candidate: Maybe we can say each user is uploading two per day. That equals 10 megabytes per day per user.
- Candidate: I am not going to get too much into this yet. I just want to get a rough idea for the big chunk here, which is videos. The rest of it, user metadata, is going to be minimal. I think it is going to be 1 KB per user per day.
- Candidate: I think that is a pretty good estimate, roughly.
- Candidate: Cool. With all that, is there anything else that you can see that I am missing here? Does that seem like a good rough overview of the system that we are trying to tackle?
- Interviewer: Yeah, this seems like a good overview. I think we can dive in now.

## Design

- Candidate: Okay. I am going to start with a couple of API endpoints, just to wrap my head around this. I think I would like to start with upload video.
- Candidate: If I talk about the database schema that backs that, and I will not get too much into the parameters of it, really our user object is going to be something along the lines of: we are going to have some sort of user ID, and that is going to be a UID.
- Candidate: We are going to have some sort of video link. Actually, I will get to that later, but once we upload the video, we are going to want to store it in some sort of blob storage, like S3. This will be a fully qualified link to that object, so this would be a URL.
- Candidate: Then maybe metadata. This would just be string data. That is the first endpoint I am thinking.
- Candidate: Let me go into that real quick. I am not going to get into much of the user detail stuff here, because I think that is sort of a solved problem. We can get to that if we have time, but for the scope of this, I am not really going to talk too much about it.
- Candidate: I am just going to take a minute and think this through.
- Candidate: Okay, cool. Obviously we are going to want some sort of database to back this. This is going to be where we store this table. I am assuming, for right now, this is going to be a relational database, Postgres, whatever flavor of relational database you choose.
- Candidate: Upload video is going to send this object to the relational database.
- Interviewer: Could you briefly talk about the differences between a relational database versus another type of database, and why we might want to use this?
- Candidate: Yeah. A relational database versus a NoSQL database, for example: relational is going to be a little bit more structured. Typically, you use relational databases for things like user data objects, linking different tables together.
- Candidate: For example, you can have a single user that has many videos. You would have many video objects, and those can be stored in two different tables. You can do SQL queries against those things.
- Candidate: NoSQL databases are really good for unstructured data, like log data, things like that. They are a little bit more free-form in nature, not as structured in the sense that you are going to be querying that data and doing a lot of joins to it. You are more likely to be free-form searching for key-value data inside it.
- Candidate: In this case, a relational database can be a lot more strict, but it can also be more space and speed efficient for specific queries. I think that makes sense here.
- Candidate: What we do is upload the video object to this database. Actually, rather, this would just be the video data. The best way to describe this is the video table.
- Candidate: This is going to send to the video table. The idea here is that this is just the data, because what we then want to do is send the actual video object to some sort of cloud bucket, like I mentioned before. Like S3, just use this cloud thing, a blob store.
- Candidate: The video itself actually lives here, and then in this table we have a link to that.
- Candidate: We are going to be running a POST to this upload video endpoint. This would be my video plus my user information.
- Candidate: The upload video endpoint accepts the video and the user information. We save it in the table, upload it to blob storage, and then return some sort of 200 response, which is what the API would respond with to the app itself, saying that the video went through correctly.
- Candidate: That handles our upload section. It is pretty straightforward for the upload section. Are there any questions about that, or anything you think I missed?
- Interviewer: No, I think that makes a lot of sense. We have the overview of where the video goes, where the metadata goes, and how the app would make that request. I think that makes sense.
- Candidate: Cool, awesome.
- Candidate: Let's talk really quick about the view feed. This will be a similar endpoint, view feed, and this is actually going to be a GET request.
- Candidate: When you open up the app, I think, would we want to load this content right when the application opens? I am guessing we want to start pre-loading as much as we can ahead of time so the user is not waiting too much for videos to load, right?
- Interviewer: Yeah, I think we would want to do that insofar as it would let us view videos faster, but maybe not so much that it would use up user bandwidth and things like that.
- Candidate: Yeah. I think maybe the top, whatever the first three videos are, we would want to grab those as quickly as possible.
- Candidate: The reason I asked that is I think it would make sense to have some sort of Redis cache over here, some sort of cache, whatever it is. The idea here is that we actually preload a list of the top 10 videos that we are going to load for the user before they even get to the view feed page.
- Candidate: If a user with a specific user UUID hits this view feed, we go to this cache that is already pre-built and grab those top videos that are already pre-selected.
- Candidate: For example, this UUID would respond with 10 video links associated with that user ID and the links for blob storage. Then the app would grab them from the blob stores right away. Does that make sense?
- Interviewer: Yeah, that makes sense. That is super interesting. Can you tell me a little bit more about how the cache would work?
- Candidate: Yeah. I am thinking about a service here in the background that would run. This would be a pre-cache service. It would run on a schedule, but also maybe on demand.
- Candidate: What it would do is compile playlists for users and pre-cache them. It could be based on when the user actually goes and does the GET request, so that we preload the next one, or we just do it in the background. There are a couple of strategies we could use there.
- Candidate: What I am trying to get away from is relying too much on doing this at request time, because from what I can tell, this system seems very read-heavy. There is going to be a lot of reading going on.
- Candidate: In addition to having this main database, which I will get to scaling in a bit, I think for this main database we also want some sort of read worker, which would be a read-only database.
- Candidate: The reason is that we do not want to create too much load on the single database that is accepting these uploads. We want to have something that manages the reads.
- Candidate: In fact, I would do something like this: the secondary is pulling from the primary, and it is used for read-only. It builds the pre-cache, which loads the cache, and then when the view feed gets hit, it loads it instantly. At least the query does.
- Candidate: Does that make sense?
- Interviewer: Yeah, that makes a lot of sense.
- Interviewer: Getting back to one of the first questions about latency, can you talk a little bit about how introducing this cache would affect latency in the system and seeing updates and things like that?
- Candidate: Yeah, for sure. One thing we would need to consider is how quickly we want updates. If I upload a video, I do not know if the video I upload would show up in my feed, and if so, how quickly.
- Candidate: This feed is basically a curated list of videos. Because I know TikTok has a special algorithm they use to populate your feed, I am trying to get rid of all that happening at the moment of GET, at the moment of loading the app.
- Candidate: I am trying to have it pre-built, so right away we get what we need from the back end and do not have to wait for some service to compile that on the fly.
- Candidate: This also solves a little bit of our scaling issue. If you imagine TikTok has a million users, what if one million users all get on at the same time and run the same exact query? We could really kill our databases because we are running all these queries at the same time. We can also increase that latency.
- Candidate: You can solve that with auto-scaling groups, but even auto-scaling groups take time to spin up. That is the thing I am thinking about here.
- Candidate: The real key is that I noticed this seems very read-heavy, so I am trying to get to the point where those reads are managed on their own.
- Interviewer: Yeah, I think that is a great insight.
- Candidate: Cool. I think that handles the view feed for the most part. I feel pretty good about that.
- Candidate: The last piece here would be favoriting videos. I think we would have just another endpoint here.
- Candidate: This would just be, I am going to call this user activity maybe, or something like that. That is a little bit generic, but I am going to speed through this. We are a little bit long on time. I would try to name it something better in the real world, something more descriptive of what it actually did.
- Candidate: The idea here is that when I hit user activity, this is follow, liking videos, that sort of thing.
- Candidate: The idea behind user activity is that it is literally just going to hit this database. I would have a different table here, some sort of followers table or user activity table.
- Candidate: This table would look something along the lines of still having a user ID and a UUID.
- Candidate: I think this would be a followers or user activity table. We are going to need a couple of keys here. Following is going to have to be a foreign key to another table, because for any one user, we are obviously going to be following multiple other accounts.
- Candidate: We need another table that has a list of user IDs that I am following, user accounts.
- Candidate: In addition to that, we want likes. We want to store another foreign key to a videos table. I am assuming if each account has a table of videos, we would probably want to have a video UUID, like a video ID. This would be a UID field so that I can key to this video ID and say that this is a list of the likes I am liking.
- Candidate: This all feeds later into the pre-cache service algorithm, which I am not going to get into, but I think that is important to store.
- Candidate: Basically, whatever activity I have, all this user activity is going to hit the database and add that to the table. I am now following this user, I am liking this video, etc.
- Candidate: If I ever needed to run a GET request, which it sounds like the pre-cache service will actually need to run, it would run some request against user activity, or maybe we have an internal service that manages that. I am not sure.
- Candidate: I would have an API that returns all the user's likes and followers, essentially. Maybe that is a GET request from user activity. That is the rough idea of what I am thinking for that. Does that make sense from a flow perspective?
- Interviewer: Yeah, that makes sense.

## Follow-up questions

- Interviewer: Awesome. I think we have the main interactions here. We have got most of the features structurally built out. I would be curious as a follow-up: what do you think would be the bottlenecks of the system if you were to, for example, 10x the traffic one day, or something like that, to really scale things up?
- Candidate: Yeah, absolutely.
- Candidate: The first thing I have to think about is regions. If we are thinking about having multiple versions of this in regional data centers, we might want to consider geolocating.
- Candidate: My first inclination is that whatever user we are going to put, the user should be behind some sort of CDN. Basically, all these API endpoints are going to want to go behind some sort of content delivery network, like Akamai or something like that.
- Candidate: The minute we grab a video, for example, let's say in a lot of situations where we really 10x traffic, it is typically in scenarios around somebody famous sending out a video. They have 10 million followers, and everyone wants to view the video.
- Candidate: The idea behind the CDN is that the minute the first person grabs it, the CDN caches it locally on the CDN system, so all the users who are grabbing it are just grabbing it from the CDN.
- Candidate: The CDN is routing to the closest local node, so the internet traffic is not always hitting my system or my blob storage. It is only hitting the CDN. That sort of fronts it.
- Candidate: Obviously these videos are relatively big. At scale, when we are talking about 10 million users times five megabytes per video, that is a substantial number to deal with. Putting a CDN in front of that is important.
- Candidate: I think having a load balancer in front of these API endpoints as well will do a couple of things. Number one, it will let me commit to this highly available non-functional requirement, because these API endpoints can be scalable and we can do things like have multiple deployments, multiple services running.
- Candidate: The load balancer is picking which one of these services is available at any one time and routing traffic accordingly. A or B, for example.
- Candidate: Not only is it balancing between the two, but it also lets you do things like zero-downtime deployment. If we have to update the back-end software running this, we would flip all traffic to B and only allow B to serve traffic while A is down and getting updates.
- Candidate: A to B is a very simplistic view. That could be hundreds of compute instances, but that is the idea.
- Candidate: That is where I see the bottleneck. Like I said, the database is always a bottleneck. We would definitely have a main write database with read-only workers that manage the GET requests. These would also be in some sort of auto-scaling group, so we could scale them up as needed.
- Candidate: Same thing with the pre-cache service. Once we got into more detail about what we needed, and what timing and requirements we needed for the pre-cache service, we would have a pretty good understanding.
- Candidate: I do not know how auto-scaling the pre-cache service would have to be. It might just be able to be set in stone or roughly equivalent to known demand ahead of time.
- Candidate: Cache is a similar situation. Caches are pretty scalable and things like that.
- Candidate: One last thing I think about is the write database. If we were to 10x traffic to this, we would want to consider some sort of database sharding. We would have some sort of database shard service in front of this.
- Candidate: The sharding service sits in front of the writes. It is like a load balancer for databases, essentially. It picks which database it is going to go to based on some sharding algorithm or strategy.
- Candidate: There are all kinds of sharding algorithms or strategies. The simplest version is maybe by region. All US requests go to this database, all UK requests go to this database. You can do things like that.
- Candidate: That is the way I would picture it, because that helps us split the load between these databases.
- Interviewer: Yeah, awesome. We jumped into some details there. Overall, we have got all the pieces in place, and I think this is a pretty good stopping point.
- Interviewer: Do you have any last things you would add to this before we wrap up?
- Candidate: No. I think the one thing I might add if I had a little more time is to get more into the pre-cache service, because I think it might need its own almost separate database structure and things like that.
- Candidate: But like I said, I do not want to get too much into the weeds with the TikTok-specific algorithm stuff. I think just keeping it as saying that this exists somewhere and we would use it is good enough for the purposes of this interview.
- Candidate: I feel pretty good about it.

## Interview analysis

- Interviewer: Awesome. All right, let's call it here.
- Interviewer: Just recapping what we went over: we talked about designing the API, database structure, different microservices, load balancing, and things like that.
- Interviewer: Overall, I thought you did a really awesome job of clearly communicating all these ideas and also jumping in and providing extra knowledge about specific things.
- Interviewer: Even when I asked a follow-up question, or even without asking, I feel like you really jumped in and showed that you had mastery over all of these topics, which was really awesome.
- Interviewer: Even though this is a little bit of a condensed version, I feel like you could have gone multiple layers deeper on any of these topics. It really shows me that you know what you are talking about.
- Interviewer: What did you think overall?
- Candidate: Yeah, I think it is always interesting trying to design something that you have never used. We are sort of having to make a couple of assumptions. Knowing Facebook and Instagram, I understand those, so making some assumptions on how TikTok is used by people really helped.
- Candidate: Yeah, I thought it went well.
- Interviewer: Well, thank you so much, Adam, and good luck to everyone on your system design interview.
