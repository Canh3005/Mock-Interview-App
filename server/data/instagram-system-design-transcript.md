# Instagram System Design Transcript

## Introduction

- Speaker: How to build Instagram. Everyone, in this video we are going to be talking about how to build Instagram.
- Speaker: We are going to be going through a system design interview question. This is similar to the kinds of interview questions you might be asked at companies like Facebook, Google, Amazon, etc.
- Speaker: Today we will be going through an example of one of these problems. I will be giving an example answer, and I will also talk about some of the strategies and tips I would use to answer this question.

## Question

- Speaker: Let's imagine we are trying to build Instagram.
- Speaker: We are trying to build a reduced feature set, but we are still trying to think about scalability and building something that will work reliably.
- Speaker: We are designing Instagram, and we need to think about the requirements of our system before jumping into components.

## Clarifying questions

- Speaker: Before we begin, what I typically do is take a moment at the beginning of the interview to really understand the question and the problem.
- Speaker: Then I go through some of the requirements and features that I think we will need to be able to build.
- Speaker: This is a good opportunity to brainstorm features and think about the scale of your application.
- Speaker: The requirements are something I would flesh out and discuss with the interviewer. I would make sure I understand what each of these things means and what the requirements would look like.
- Speaker: For the mobile client requirement, we could get more specific. What is a mobile client? Is it a native app? Is it mobile web? Do we need to support other platforms?
- Speaker: We could ask whether we are concerned about constraints like network, storage space on the device, and other client-side limitations.
- Speaker: For users following other users, we can get into what that model looks like, and we will do that later.
- Speaker: For the feed of images, we can talk about expected latency for getting images, how often the feed should be updated, whether the content should be fresh, and whether it includes only people you follow or some kind of explore feature.
- Speaker: For scale, there is a lot we can get into. That is what I like to start with first when thinking about a system design: what scale does our system need to work at?

## Answer

- Speaker: Let's talk about our requirements.
- Speaker: The first requirement is that we need to be able to upload images from a mobile client like a phone, either iOS or Android.
- Speaker: Our second requirement is that we need to allow users to follow other users, so they can see content from other people.
- Speaker: We would also like to generate a news feed, or a feed of images, and display that to users when they visit the app.
- Speaker: We maybe will not get into a super complicated feed, but we should at least think about the API to request that feed and how we would ensure it is generated reliably.
- Speaker: The last thing is that we do want to think about scale.
- Speaker: Let's imagine that we want to design a system that will scale up to support 10 million users.

## Requirements

- Speaker: The requirements are: upload images from a mobile client, allow users to follow other users, generate a feed of images, and scale the system to support 10 million users.
- Speaker: Uploading images means a user on a phone, such as iOS or Android, can send photos into the system.
- Speaker: Following users means one user can follow other users and then see their content.
- Speaker: The feed requirement means the system can generate a news feed of images and display it when the user visits the app.
- Speaker: We will not build a super complicated feed in this answer, but we will think through the API and the system required to request and generate it reliably.
- Speaker: Comments and other types of engagement were not explicitly in the requirements, so we will ignore them for now, though they are features we could think about later.
- Speaker: We need to store users, photos, follower relationships, photo metadata, and a reference to the file storage location for each image.
- Speaker: Since the images are large, we will not store the images directly inside the relational database. We will store metadata in the database and image files in distributed object storage.

## Scale

- Speaker: Let's start with the 10 million number and break that down into what it actually means.
- Speaker: Assume we are talking about 10 million users who use our service on a monthly basis, so 10 million active monthly users.
- Speaker: Imagine each of them is uploading two photos per month. That is how we define this active user, and that is our average case.
- Speaker: Let's say each of those photos is around five megabytes. Let's allow that to include some metadata like the caption, location, and maybe other photo metadata that we want to include.
- Speaker: We will ignore things like comments and other types of things we might need to store, because those were not explicitly part of our requirements, but they are something we could think about later.
- Speaker: Let's crunch these numbers a little bit. Ten million is 10 to the 7th. Times 2 photos. Times 5 megabytes. That is basically 10 to the 8th megabytes.
- Speaker: That boils down to 100 million megabytes, which is 100 terabytes per month.
- Speaker: Times a year, we are looking at about 1.2 petabytes of data.
- Speaker: That is a lot of data, and it is only going to grow over time.
- Speaker: Doing this exercise informs how much traffic we will have, what our storage requirements are going to look like, and what sort of system we should choose to support those requirements.
- Speaker: Since we are talking about a lot of photo data as well as metadata, we know that looking forward into the system, we have to think about different ways to store those types of data and how to do it reliably and efficiently.

## Design

- Speaker: The next thing I would do before getting into specific components of the system is take a step back and think about the API or the data model of the system.
- Speaker: In this case, let's start with the data model, because I think we know clearly which things we need to store.
- Speaker: Then we can talk about the API a little bit later.
- Speaker: We have three different data types that we need to model: users, the photos they are posting, and this user-following model where we need to store the relationship between different users.
- Speaker: I am going to sketch out those three database tables, and I will also talk about the kinds of database I would choose for these different types of data.
- Speaker: First, let's make this our user table. We will make one table for photos, and we will also make one for followers.
- Speaker: The first thing I want to talk about is our choice of database.
- Speaker: We have a lot of choices here, and we have multiple kinds of data, so we can store things in different ways.
- Speaker: This is what I view to be a fundamentally relational type of data problem.
- Speaker: We know we have clear types of data: users, photos, and a relational system between them.
- Speaker: Users are related to other users in a many-to-many way by way of this following mechanism.
- Speaker: One user can follow many users. Many users can be followed by a user. A user can be followed by many people.
- Speaker: On the other hand, photos are related to users in a many-to-one way.
- Speaker: One photo can only have one user owner, but a user can have many photos.
- Speaker: There is this inherent relationship between the kinds of data we are trying to model, and to me that lends itself to a relational database.
- Speaker: By relational database, I mean a SQL database like MySQL, Postgres, or any of the other options.
- Speaker: There are other options. We could also look at NoSQL databases.
- Speaker: What I would suggest is that you think about whether your data is inherently relational and whether you would benefit from being able to do relational queries.
- Speaker: In this case, being able to quickly get all the photos for a particular user is something you would have to do on a regular basis.
- Speaker: That is an inherently relational query pattern. So I think choosing a SQL database makes perfect sense.
- Speaker: I am going to go with that.
- Speaker: I am going to start modeling out these tables based on the requirements we know we have in our system, and using common patterns I have seen before.
- Speaker: In the user table, we will have a primary ID. It will be our primary key, an integer that increments.
- Speaker: This is SQL-speak in terms of the schema of this table.
- Speaker: Other things we will probably need for a user include a name, which will be a string.
- Speaker: We will probably have an email address, which will also be a string.
- Speaker: We may have a location, perhaps some other ID, or other attributes about the person.
- Speaker: We could include timezone and things like that. These are the basic things I think we need to get started.
- Speaker: In the photo table, we will also have an ID. This will again be our primary key.
- Speaker: In this case, we will have a foreign ID referencing the user. This will be a foreign key referencing the user ID.
- Speaker: That is the relationship between these two tables.
- Speaker: We will probably have a caption or description for the image.
- Speaker: Then we might have additional metadata, like the location it was stored, which might be a string or coordinate type.
- Speaker: Lastly, because of the large nature of these images, we are not going to store them in the database itself.
- Speaker: We are only going to use this database to model the metadata about the images and about users.
- Speaker: What we need here is some sort of path or URL. That path or URL will reference our distributed file system.
- Speaker: The distributed file system is what will actually store, replicate, and handle everything related to storing these image files.
- Speaker: Those are the basic building blocks of the photo table.
- Speaker: Lastly, I am going to talk about the following model for building followers.
- Speaker: In this case it is actually pretty simple. We could have two columns: user one and user two.
- Speaker: These are both foreign keys referencing one user and the other user.
- Speaker: What this table does is model one direction of someone following.
- Speaker: User one can follow user two without user two following user one.
- Speaker: Instead of calling them user one and user two, we could call them from and to, to model this single-direction relationship.
- Speaker: This is a little bit different from Facebook, where friends are inherently bidirectional.
- Speaker: That is something to keep in mind as you think about this relationship.
- Speaker: Now we have our basic data model in place.
- Speaker: Let's talk about the overall system and the high-level components that we need to bring all this stuff together.
- Speaker: We need to keep in mind the scalability and requirements we laid out at the beginning.
- Speaker: We also need to keep in mind the features we need to support: users uploading photos, users following other users, and users seeing the news feed of images posted by their followers.
- Speaker: Moving on, let's talk about each of these components.
- Speaker: At a fundamental level, I will start with the database, since that is what we were just talking about.
- Speaker: This is going to be our metadata database.
- Speaker: One important piece is the idea of the image paths that we are storing in the photo table, and where those image paths point.
- Speaker: We are also going to have a distributed object storage mechanism, something like S3.
- Speaker: We will leave it a little abstract, but what we want to do is use a distributed file system like S3.
- Speaker: That system stores and replicates our data in a reliable way.
- Speaker: Then we store the reference paths to files that are stored there in our metadata database.
- Speaker: That way, we have a separate reliable place to upload images and reference them.
- Speaker: That object storage will be accessible and fast.
- Speaker: There are a few ways we can improve the efficiency of this, which we will get into in a moment.
- Speaker: Essentially, there is this connection between the metadata database and object storage.
- Speaker: Next, we will talk about the application service layer.
- Speaker: We have not gotten into this yet, but this is the actual core of our system.
- Speaker: These are the servers responsible for CRUD operations: create, read, update, and delete.
- Speaker: This is what responds to requests from clients, whether mobile or web.
- Speaker: It handles those requests, performs operations on the database, gets information, and returns it to the user.
- Speaker: This is really the core part of any web back-end system.
- Speaker: In large applications, there are often many different kinds of servers.
- Speaker: The typical pattern is to start with a monolithic architecture.
- Speaker: You build a web app that responds to all the different types of requests coming in.
- Speaker: Over time, as your traffic scales up and you find that different usage patterns or query patterns are more popular than others, or different kinds of operations have to happen asynchronously or take a long time to calculate, you start splitting up the monolith into different services or microservices.
- Speaker: Those microservices perform specific operations and can be scaled independently of one another to optimize server usage.
- Speaker: Let's think about the access patterns that are probably going to happen in an Instagram-like application when we reach the scale of 10 million users.
- Speaker: We expect there to be a lot more people viewing and reading their feed than people uploading.
- Speaker: We need to do both operations efficiently and support different access patterns that happen at different peak times of day.
- Speaker: There are all these usage patterns we need to be aware of that might affect how we build our system.
- Speaker: Knowing that this is a read-heavy system, we probably do not want just one database.
- Speaker: We want read replicas of this database.
- Speaker: Read replicas allow us to efficiently read data without slowing down our ability to write data and upload new images.
- Speaker: This allows us to achieve higher scalability and larger throughput of request volume.
- Speaker: Database connections are often one of the major bottlenecks of any system.
- Speaker: We are going to build our application server here.
- Speaker: What I would like to do is split this into maybe two different services.
- Speaker: Let's think about the read services and the writing or uploading services separately.
- Speaker: They may have different patterns, different requirements, and require different types of caching or other things.
- Speaker: For the read service, we might implement caching between the database and the app server.
- Speaker: This could be an in-memory storage system like Redis.
- Speaker: That would allow us to return frequently accessed data much faster than making a request to the database every single time.
- Speaker: I am going to move these over a little bit so I can put this cache between them.
- Speaker: We will need some sort of cache here.
- Speaker: On the write service, we write to the database and also process uploads.
- Speaker: There are several different caching policies, and I will not get into all the different ways those work.
- Speaker: Essentially, we want to use a write-through or write-back policy.
- Speaker: When a write behavior or update happens on content in our database, we want to update our cache at the same time.
- Speaker: That way, downstream, the read service that uses this cache to return data to users is updated in a reasonable time.
- Speaker: It also remains consistent with the source of truth in our main database.
- Speaker: I am drawing arrows to represent these relationships, but there are multiple ways this update could happen and multiple ways these things could be triggered and implemented.
- Speaker: In reality, this would probably be some sort of distributed cache system like Redis.
- Speaker: It would be performant and sit separately from the main database.
- Speaker: Now we have two different services responsible for different parts of our feature set.
- Speaker: One is responsible for fetching images and returning data to the user.
- Speaker: The other is responsible for performing the upload process.
- Speaker: The upload process not only sends data into the metadata database, but also handles actually uploading the image from the client to the file storage system.
- Speaker: Now we are beginning to get a sense of what the system looks like.
- Speaker: Moving up, we are also going to need a load balancer.
- Speaker: As any system scales, it becomes very important that the fundamental pieces of the system can support the load and volume requirements of the number of users attempting to use it.
- Speaker: Otherwise, you will begin dropping requests, or it will take a really long time to serve users as requests queue up.
- Speaker: One of the most common patterns for solving this kind of problem is to scale horizontally.
- Speaker: We would not have just one app server for reading and writing.
- Speaker: We would have many servers, perhaps located at different access points throughout the world, depending on how large the application is.
- Speaker: We would serve requests to these servers in a load-balanced way, so each one is utilized equally with the others as much as possible.
- Speaker: That prevents any one server from becoming too overloaded or too overworked to the point where it begins dropping requests.
- Speaker: This is the responsibility of the load balancer.
- Speaker: It can also handle routing requests to the correct application server.
- Speaker: There could be a separate load balancer or separate routers that handle sending requests to the correct application server.
- Speaker: For simplicity, let's imagine it is one proxy doing both load balancing and routing.
- Speaker: Our client is going to make requests.
- Speaker: We will probably have a variety of mobile clients that reach our server through the internet.
- Speaker: Those clients send requests that could be getting images or uploading images.
- Speaker: Starting from the client, they call our API.
- Speaker: The API will have different routes for each of the features that we want to support.
- Speaker: Requests come to the load balancer, which is the top-level part of our system.
- Speaker: The load balancer gets the request, figures out which service it belongs to, and routes it to that service or one of the instances of that service.
- Speaker: In the read case, the service figures out what image the user is looking for, whether the user has access to this image, and whether it is private.
- Speaker: It will look to the cache first to see if it has the image data there.
- Speaker: If the cache is fresh, it will return the image data or any user metadata it needs.
- Speaker: That response comes all the way back to the mobile client.
- Speaker: It would include the path to the image that needs to be loaded.
- Speaker: That image request would probably be fired separately and loaded in a separate request from our distributed file system.
- Speaker: Sitting in between, we might have a CDN or some sort of distribution network.
- Speaker: That would make these requests faster by having access points in different places that are closer to the user and make last-mile request latency much faster.
- Speaker: In the upload case, when a user creates a new image, something similar would happen.
- Speaker: We would open a connection to the server.
- Speaker: It would begin by uploading all the metadata related to the user and the photo that we are uploading.
- Speaker: Then it would handle receiving that image and passing it on to object storage.
- Speaker: As we mentioned, that process would also cause the cache to be updated so the new content could be available to users.
- Speaker: That is basically it for the main request paths.
- Speaker: The one thing we have not talked about is the process by which we generate a feed of images for each user.
- Speaker: The way I would think about that is that it could be a process that happens and also gets stored in either this cache or another feed cache.
- Speaker: That process could be managed by the read server or by a separate service.
- Speaker: Let's call it a feed generation service.
- Speaker: This service would access our cache as well as our database.
- Speaker: Depending on the requirements of the feed that we want, it might operate on a schedule.
- Speaker: For example, it might generate a new feed for each user on an hourly basis.
- Speaker: It would talk to the database to understand which content is new and generate these feeds.
- Speaker: These feed computations are typically too computationally intensive to do on the fly for every request.
- Speaker: Instead, we can do them ahead of time, recompute these feeds, store them in our cache, and then have the app server responsible for getting the feed simply read the cached results.
- Speaker: That is basically how that would work.

## Follow-up questions

- Speaker: There is obviously a lot more detail we could go into on every single part of the system.
- Speaker: We covered a lot of ground here and talked about a lot of different components.
- Speaker: This is the overall system that I would design for Instagram.

## Interview analysis

- Speaker: If you have any thoughts or questions, please leave a comment.
- Speaker: We look forward to making more videos like this if they are helpful.
