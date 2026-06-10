# Amazon Prime Video System Design Transcript

## Introduction

- Interviewer: Design Amazon Prime Video. Hey everyone, welcome back to another Exponent system design mock interview. My name is Kevin Way, and on today's show we are going to be doing a system design video with Abhishek. Before we get started, do you want to introduce yourself to the audience real quick?
- Candidate: Sure, Kevin. Hey everyone, I am Abhishek from Bangalore, India. I have eight plus years of total experience with a varied background. I have been a software engineer, a startup founder, and an engineering manager, and I have worked at multiple companies such as Walmart, Flipkart, and Google. Overall, it has been quite an interesting journey, and I am quite happy to be a part of this Exponent video for today.
- Interviewer: Excellent. Great. Thanks for coming on today's show.

## Question

- Interviewer: This is the question that I would like to ask you for our system design interview today: design Amazon Prime Video.
- Candidate: Sure. Okay. I am one of the users of Amazon Prime, so I have a bit of an idea of how Amazon Prime works today. For the sake of this interview, I will try to keep the scope to the MVP version of it. Let's start with listing down some basic functional and non-functional requirements, and let's see how we can take it forward.
- Interviewer: Sure, sounds good.

## Clarifying questions

- Candidate: To start with, I will just list down the question also: Amazon Prime Video.
- Candidate: If we go by functional requirements, I would keep it very simple. There are two types of users that I have seen in my interactions with Amazon Prime. One is the person who creates and uploads the content, and thank you so much to them. The other is consumers like us who consistently keep searching and viewing videos and movies.
- Candidate: I will keep the same thing. I basically want three features out of this. One is upload video, the other is search videos, and the third is view videos.
- Candidate: All of these three, in terms of functional requirements, seem very simple, but when you start designing them for multiple components, it becomes fairly tricky.
- Candidate: Before we dive deeper, let me very quickly go into the non-functional requirements, and then we can pause and discuss.
- Candidate: From a non-functional perspective, the few most important things I can think of are: uploads should be fast, primarily because these are multi-hour videos that content creators upload as movies. It would not be a good customer experience if they have to wait hours to upload it.
- Candidate: The same thing applies when you are viewing the videos. There should ideally be no or minimal buffering in the videos. That means we have to streamline and improve our video rendering service quite significantly.
- Candidate: The application should have low latency and high availability, which translates to eventual consistency. The reason I am preferring this design choice is because it is fairly okay if I upload a Prime video and a few users are able to see it after 10 minutes or after 20 minutes. But once the video is available, it should be available. We cannot have transient failures in between.
- Candidate: That is why I prefer going with a low-latency, high-availability system and compromising a little bit on the eventual consistency front.
- Candidate: The last component I am interested in is reliability, which means once a video has been uploaded, we should not lose it. Again, this is purely from a customer-facing perspective and how we give customers a seamless experience end to end.
- Candidate: Kevin, these are the few functional requirements and non-functional requirements I am thinking of approaching as part of the mock interview. If time permits, we can dive deeper into additional features, for example showing the view count or adding to my wish list or some other features. But for the sake of this session, I would prefer going ahead with this. Any thoughts or feedback before we go ahead?
- Interviewer: Yeah, this sounds good. Before we start designing, I would like to dive a little bit deeper into the availability versus consistency trade-off. Can you share a little bit more about why you are choosing to prioritize availability over consistency?
- Candidate: Sure thing. If you think from a pure end-user perspective, I do not know when my content creators are going ahead and uploading the video. Let's say they upload a video at 1:00 p.m. I would be totally fine if it starts at 1:15.
- Candidate: The same would not be true if I were designing it for an IPL or Cricket World Cup match, when I know the streaming has to start dead at 7:30 p.m. India time, for example.
- Candidate: Here, because it is more from an end-consumer perspective, mostly for videos that are movies, movie series, or TV series, a slight amount of delay would be acceptable by users. That is why I am preferring availability over consistency.
- Candidate: Quoting the CAP theorem, we have to prioritize between consistency and availability. I am assuming the average user base will be around 100 million active users, and partition tolerance has to be part of the database system. So it is a compromise between those. That is the reason for the compromise.
- Interviewer: Got it. Okay, makes sense. Let's get started with the design.

## Answer

- Candidate: All right, sure. I will list down the assumption we just made, just to be clear and have it documented. I am assuming 100 million monthly active users.
- Candidate: From a core design perspective, I would list down the two types of users we have to start with. One will be the content creators, and the second type of users will be the viewers in the system.
- Candidate: I will go sequentially. I will go with the first functional requirement, upload video, continue with it, and then go ahead with search and other features. I hope that is fine with you, completing one user journey before diving deeper into the next.
- Interviewer: Yeah, that sounds good. It helps us stay organized.

## Requirements

- Candidate: Functionally, the MVP has three features: upload video, search videos, and view videos.
- Candidate: The main user types are content creators who upload content and viewers who search for and watch content.
- Candidate: Uploads should be fast, because creators upload long, multi-hour video files.
- Candidate: Viewing should have no buffering or minimal buffering.
- Candidate: The system should have low latency, high availability, eventual consistency, and strong reliability so uploaded videos are not lost.
- Candidate: Eventual consistency is acceptable for regular on-demand movies or TV series. A new upload appearing after 10 or 20 minutes is acceptable, unlike a live sports stream that must start at an exact time.
- Candidate: If time permits, optional features could include view count, wishlist, or similar product features, but they are out of scope for the main session.

## Scale

- Candidate: We are assuming 100 million monthly active users.
- Candidate: Not all 100 million users will upload videos. We can say maybe one in every 100 users uploads a video, so we are still looking at about 1 million uploading users.
- Candidate: The viewer side is much larger than the upload side, so we will scale the view service more heavily than the upload service.
- Candidate: If we start with 1 million uploaders and 100 million consumers, that suggests a 1-to-100 scale factor between the upload and view services.
- Candidate: The system needs to support multi-hour video files, multiple device types, different resolutions, and global access patterns.

## Design

- Candidate: I will go ahead and draw. There will be an upload video service. What upload video is supposed to do, before diving much deeper into the details, is receive a video from the end user and push it into the storage service.
- Candidate: Because we are dealing with flat files, we will obviously need object storage. I will bring object storage into the system design diagram. Because we are dealing with Amazon infrastructure, I will list down S3 here, which is the prominent object store model.
- Candidate: We will also have to publish metadata, for example the title of the video, the created-at or uploaded-at timestamp, and other basic metadata. So we will need a metadata DB here.
- Candidate: At the most basic level, content creators interact with the video service, and the video service dumps the information into the object store and the metadata DB.
- Candidate: This is the simplest path if I were doing it for the first 10 users or first 100 users, where I am not worried about scale.
- Candidate: Obviously, we made an assumption that we are looking at 100 million active users, which means I have to scale my upload video service to more than one cluster. That means I have to incorporate a load balancer into the system.
- Candidate: I am going to draw a few extra rectangles to indicate that it is a multi-server architecture, and then factor in a load balancer. The reason I am drawing it in between is because I will use the same load balancer from the viewer side.
- Candidate: The load balancer talks to the upload video service. Up until now this is fine. There are a few million users trying to upload videos, and obviously not all 100 million will be uploading videos on Amazon Prime.
- Candidate: We can say one person in every 100 is uploading a video, so we are still looking at 1 million users. We will use a slightly different scaling algorithm or scaling logistics for the upload service compared to the view service, which I will incorporate later.
- Candidate: The next question that pops up, which is part of our non-functional requirements, is how do we make uploads fast?
- Candidate: Because the videos are two hours long or one hour long, it makes sense to split them into, say, 10-minute-long videos each and distribute the work using a map concept.
- Candidate: I am going to bring a few things in between. There will be a video splitter. This component will again be scaled across multiple nodes. It receives information from the upload video service and splits the videos into multiple pieces.
- Candidate: Because we have to maintain track record, we will have a queue in between. Let's call this the processing queue. It acts as a message exchanger between these two services.
- Candidate: Because we split our service, we will also have to aggregate it, so let's call this a video encoder service.
- Candidate: The reason I am not calling it an aggregator and calling it an encoder is because I intend to do a lot more processing than just aggregation.
- Candidate: When you are viewing videos, it should work across multiple devices. It can be accessed by the end user on a phone, tablet, laptop, or other device. We cannot assume only one device type.
- Candidate: Even if we take two different devices or different bandwidth conditions, we have to store the same video in multiple formats and multiple resolutions. All of that will be taken care of by the video encoder.
- Candidate: The encoder will dump all that information into the object store. Because we have the upload video service, where we store information about the video metadata, it can directly publish metadata into the metadata database.
- Candidate: I think this is, at a high level, a quick gist of our upload part. I will pause here before we dive deeper into the other sections and check in with you if you want me to specifically dive deeper into some component.
- Candidate: What we have covered up until now is upload video, upload should be fast, and the basics of low latency in terms of doing an upload service.
- Interviewer: Cool. Thanks for that quick recap also. I love the way you organized this into starting with the naive solution and then how you would optimize it even more with the video splitter, the processing queue, and the encoder.
- Interviewer: How are the videos going to be stored? Are they all just going to be stored in S3, or are you going to do any partitioning?
- Candidate: We will definitely do partitioning. I was thinking of talking about it slightly later.
- Interviewer: Sure, we can talk about it later. Would you like to move on to the next functional requirement?
- Candidate: Okay. I will take 5 to 10 seconds on why I am parking this discussion. A video uploaded in the US will also be accessed by someone in India and someone in Australia. We obviously have to bring it a bit closer.
- Candidate: We not only have to do partitioning, we also have to do replication to a closer data center. I will talk more about this once we do the view component, so that I can briefly touch on it.
- Interviewer: Sure, sounds good.
- Candidate: Going to the next thing, again I will prefer going by how a user will interact. Once a video is uploaded, the next thing a person will do from a viewer's perspective is come into Amazon Prime and try to search for a video. That is my next component.
- Candidate: We will have a simple search service. Without making things complex, because search is a basic feature and in the interest of time, I will just use an Elasticsearch video API at the back end.
- Candidate: A customer searches for videos by the title of the movie they are looking at. That is an assumption I am making. Let me know if you want me to search by something else, but as a user I always type the name of the movie or TV series I am planning to watch.
- Candidate: It is safe to say that the search API will talk heavily to the metadata database and not so much to the file store, because its job is just to return the name of the movie, the title, the thumbnail at maximum, and maybe future features like a preview clip.
- Candidate: For the scope of this, we will talk heavily to the metadata database and return a response all the way back to the viewer who invoked the query through the load balancer.
- Candidate: This is all we will do on the search side. How we implement search can be discussed later if time permits, including how metadata will be stored in the database. It is a simple videos table, and we can discuss that if time permits.
- Candidate: I want to jump into the view video section, if you are okay with it, primarily because that is also very interesting. That is where half the latency and availability compromise will come into the picture.
- Interviewer: Yeah, let's dive into view videos.
- Candidate: All right. Going into the last part, I call this the view video service.
- Candidate: There is one very important thing to note. The number of viewers on Amazon Prime is always exponentially larger than the number of uploaders. It is basically a read-heavy service.
- Candidate: The scale component, which I even forgot to incorporate in the search, means that because it is read-heavy, we will have a lot more people searching for videos than uploading. I am increasing the number of boxes to show that I am scaling search more than the upload service.
- Candidate: The view video part will be a very critical service to the entire architecture. I would definitely scale it N times more. The value of N depends on how many users are in the system at any point in time, and it will obviously be an autoscaled architecture. I am not going heavily into the Kubernetes part.
- Candidate: We scale the view video service a lot because, even with the initial assumption, 1 million people are uploading videos and 100 million people are consuming them. We are looking at a 1-to-100 scale factor between the upload and view service.
- Candidate: Now comes the interesting part. If we are talking about how to store the files, we will store them in some central repository.
- Candidate: I would not want to wait for the first API hit where I push the data into cache. We will have both a CDN and a cache, just to render the data in the right format. I will explain how I intend to use both.
- Candidate: If I am interacting with cache or the metadata DB, the mode of interaction will be that when the viewer fires a request to the load balancer, the load balancer sends a request to the view video service.
- Candidate: The view video service will first check if the information is already available in the cache. Because we are looking at a multi-hundred-million-user component, I do not want to hit and overload the database in general.
- Candidate: If the metadata is not available in the cache, we will fetch it from the database, store it into the cache, and render the video response.
- Candidate: For metadata and search, it is slightly okay if we use a pull-based cache mechanism. Search can have a bit of latency. If you return the response in 10 milliseconds or 20 milliseconds instead of real time, that is acceptable.
- Candidate: Unfortunately, for Amazon Prime or any other video rendering service, the same availability parameters do not hold when you are streaming it. Nobody likes buffering video.
- Candidate: When we are designing our cache and CDN, which will be used for exchanging file information, I would want to use a push-based mechanism from the object store all the way to the CDN.
- Candidate: The core gist is that I do not want the end user to wait for me to fetch a 5 GB file into cache on the first hit, because every single user matters.
- Candidate: For Prime, the number of users uploading videos and the number of times a movie gets uploaded is not as high-frequency as it would be for Instagram Reels or YouTube videos. So I change it to a push-based mechanism.
- Candidate: As soon as there is a new video uploaded, I want to cache it closer to all the geographical servers. Then viewers will directly interact with this.
- Candidate: From a scale perspective, I do not want the viewer to go from viewer, to load balancer, to view video service, just to be able to stream the video. We are looking at very low latencies.
- Candidate: This does increase our system cost, because we are looking at a heavy file storage service or CDN component, but that is a trade-off I am willing to make because I am trying to satisfy the no-buffering criterion and high availability.
- Candidate: This is where the high availability and eventual consistency trade-off becomes clear. I am pushing my videos from the object store to the cache.
- Candidate: The question becomes: when do I push? If I push during peak hour, I will be throttling my own network and increasing network congestion. Maybe I would want to push at off-peak hours, when the active user count is slightly low, or at scheduled intervals every few hours.
- Candidate: That would help me balance things, but it also means that a video available in the US at 6:00 a.m. may be available in Australia at 8:30 a.m., because I am waiting for traffic offload to happen. That is where the high availability and eventual consistency trade-off was critical.
- Candidate: I know we are pretty much on time from where we started. I will pause here. We can circle back, review some components, take some time to answer any questions I may have sped through, and dive deeper accordingly.
- Interviewer: Sure. I love the way you organized this, Abhishek. It was very clear to me, and I was able to follow along the entire time. I think this is a very valuable video for the audience.

## Follow-up questions

- Interviewer: Before we wrap things up, I did want to ask one question. Let's say Amazon Prime just released a very hot, very trending video that a lot of people are going to log on and try to watch. Can you walk me through the user journey here and maybe tell me if you are going to strategically add any new services or components or caching to support this very hot and trending video that is just going to be uploaded?
- Candidate: Sure thing. I am a big Game of Thrones fan, and I am watching House of the Dragon right now. There are times when, as a hardcore fan, I literally wait for the clock to hit that launch time and then start pinging it. That is exactly the case we are talking about here.
- Candidate: I would not change the design much, Kevin. What I would do is, when I am doing the peak/off-peak CDN push, I would want to have control over manually publishing or force-publishing a few titles that I know are going to be super hit titles.
- Candidate: I know this increases a bit of onus on the product managers or service owners. They have to be cognizant of the demand we are expecting.
- Candidate: But because we are doing a push-based design, it totally depends on us how we want to define the push frequency.
- Candidate: Most cache services offer the ability of a force push or reset by setting the refresh cycle to a very low number. Any cache information that you store gets refreshed every now and then depending on the time to live that you specify.
- Candidate: For critical video launches, critical days, or during the holiday period, I can do two approaches. I can do a force push from my side, or I can set the cache TTL very low.
- Candidate: That does not require significant code changes in the system architecture, but it would be a very good feature to incorporate, specifically for Prime hot videos that will be very actively used by end users.
- Interviewer: Cool, great. Thanks, Abhishek.

## Interview analysis

- Interviewer: I think this was a really good mock interview. I loved how your communication was very clear throughout the video. I loved your drawings, and your structure was very clear for me to focus on.
- Interviewer: You were able to write out the functional requirements, uploading, searching, and viewing, and you took pauses between each one to see if I had any questions. I really appreciated that.
- Interviewer: You were able to anticipate some risks and talk about how you would mitigate them throughout your design, so I thought that was very good.
- Interviewer: Before we end the video, did you have any tips for the audience on how they might want to approach a similar question if they face this in an interview?
- Candidate: Sure. Based on multiple previous experiences that I have through mock interviews and previous experience, I have noticed people trying to overdo a lot of things when they try to do system design. It is normal. We are trying to impress the interviewer, no questions asked.
- Candidate: But in the attempt to overdo it, we either go chaotic or we are scattered all over the place, and none of that is desirable. That takes away the freedom of taking brief pauses after you complete one end of the user journey.
- Candidate: The regular advice I give is: decide on the functional requirements, like upload, search, and view. Try to complete one of them. In that case, even if you run out of time, you have completed two out of the three features, and it gives the interviewer a good opportunity to assess you on completed journeys rather than seeing you jump back and forth between exercises.
- Candidate: It is okay to miss a few assumptions. For example, I missed initially listing that we will be viewing videos across multiple devices. When I started talking about it, it made absolute sense. It is okay to go back and refine a few things here and there.
- Candidate: What is important is to take pauses in between to think. It not only helps the interviewer catch up, it also gives you extra time to think about how you want to structure your thoughts further ahead.
- Candidate: The other thing I have seen is that people start designing directly for 100 million users. When you do that, you may end up making mistakes. Trust me, even amazing products like Amazon Prime, Netflix, and Facebook scaled their architecture with time.
- Candidate: Why make the same mistake in a system design interview, where by default I am nervous because I am the one being interviewed and judged? It helps to gather your thoughts and take it up gradually.
- Candidate: I could have brought in the load balancer a lot sooner, but I would have cluttered my thoughts if I went ahead and incorporated that. Those are the only two things: I prefer going slow and completing one journey after the other before picking the next requirement.
- Interviewer: Nice. I think those are very great tips. For the audience watching at home, this concludes our video. Good luck with your upcoming system design interview, and for more mock interviews feel free to check out tryexponent.com. Thanks so much for watching. Do not forget to hit the like and subscribe buttons below to let us know this video is valuable for you. Check out hundreds more videos just like this at tryexponent.com. Thanks for watching, and good luck on your upcoming interview.
