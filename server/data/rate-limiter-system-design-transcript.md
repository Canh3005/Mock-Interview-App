# Rate Limiter System Design Transcript

## Introduction

- Interviewer: Can you design a rate limiter for us? Hi everyone, and welcome to another mock interview with Exponent. Today I am here with Josefa, who has been with us before. Would you like to introduce yourself for anyone who is seeing you for the first time?
- Candidate: Yeah. Hi everyone, I am Josefa. I am an engineering manager at Meta.
- Interviewer: Nice to see you again, Josefa. Today we are going to do a system design mock interview.

## Question

- Interviewer: Our question for you is: can you design a rate limiter for us?
- Candidate: Yeah. To get started, the rate limiter is a system that blocks a user request or allows a certain number of requests to go through in a specified period of time.

## Clarifying questions

- Candidate: Why do we need rate limiters? We need rate limiters to prevent DDoS, denial-of-service attacks. It helps reduce costs for the company because they need fewer servers to manage their load, and it prevents overload for the system.
- Candidate: Some kind of attack can hamper the actual users of the system. The idea is that any one particular user, or set of users, should not exponentially take up most of your computing power. That is why we would use a rate limiter.
- Candidate: Some questions I would have on the right side: we would want to implement a server-side rate limiter.
- Interviewer: Yeah.
- Candidate: We could throttle users based on some kind of unique identifier. It could be user ID or IP. I think the most common approach is using an IP address.
- Interviewer: Why would you use that over anything else?
- Candidate: I think IP address is something that is always unique to users, and you can narrow down a set of users or IPs that seem to be problematic. User IDs can be fake. You can create new accounts, and then it is difficult to distinguish a good user ID from a bad one, whereas it is easier on the IP side.
- Candidate: I think we need to inform the user once we block them. The HTTP layer has a built-in protocol for that, so from the server we send a 429 status response code back to the client, informing them that they have been throttled and blocked.
- Candidate: I think we should obviously have some kind of logging mechanism on our side in order to do analysis on traffic patterns, what IPs we are getting, and any retrospective we need to do over time based on the traffic we have.
- Interviewer: Sorry, go ahead.
- Candidate: No, that is fine.

## Answer

- Candidate: The next thing I want to talk about in the rate limiting space is how you would rate limit a user. Once we have identified an IP or a set of IPs that we want to rate limit, what technique would we use to rate limit them?
- Candidate: There are many algorithms available based on what you are trying to optimize for. I am going to talk about a couple.
- Candidate: One is the token bucket system. This is a very simple implementation. Think of it as having a set of tokens, and every request takes one token. The bucket gets filled at a constant fixed rate of tokens per second.
- Candidate: For simplicity, let's say the bucket is filled at the rate of one token a second. As requests come in, a token is used up. If a request comes in and the bucket is empty, and there are no tokens available at that time, then we block or throttle the request.
- Candidate: Instead of forwarding the request to the server, we send the user back a 429 response.
- Candidate: It is a simple implementation. Obviously, there are downsides. If there are spikes in traffic, you would have a large number of users not getting the response they want, so you would have to keep tweaking the size of the bucket.
- Candidate: Another very popular system is the fixed window system. Given a time window, you have a fixed number of responses available within that time window. Once those responses are used up, until the clock starts again, no request can get handled.
- Candidate: If, in a 10-second window, you have 30 requests that can be handled, once those 30 requests are used up in the 10 seconds, you have to wait for the next 10-second window to start before new requests can be processed.
- Candidate: The downside is that you could have cases where requests come in toward the end of the 10-second window and at the start of the next window, so you could have a spike of requests processed very quickly, followed by large spaces of time where no request can get processed.
- Candidate: There are varying implementations of this algorithm, like sliding window systems, where based on traffic patterns you are constantly tweaking the window size and the counter in each window to best suit your needs.
- Candidate: Any questions so far?
- Interviewer: Okay. Let's say we are designing this rate limiter for a website like Twitter. What would you choose in that case?
- Candidate: For something like Twitter, we could use an adaptation of the fixed time-window algorithm. I would use more of a sliding window, where we are not fixing the amount of requests per second, but we keep sliding them as time goes by. If there are extra requests that are no longer used, we can keep sliding the window with it. That way, spikes in traffic and lulls can be handled well.
- Interviewer: Got it. Is there a limit to how much you can slide over for each of these windows?
- Candidate: Yeah. Those are configurations you can set when you define the rules of the system. I will get into some of those details. In the high-level design, you define a rule engine that determines the size of the window, how many counters you need within each window, and what the sliding scale is.
- Interviewer: Okay, let's get into that.

## Requirements

- Candidate: The rate limiter should be implemented server-side, because client-side implementations are easy to forge or bypass.
- Candidate: We need to support throttling based on identifiers such as IP address, user ID, geography, or other criteria.
- Candidate: The common primary identifier is IP address, because fake user accounts can be created, while problematic IPs can be narrowed down more easily.
- Candidate: When a request is throttled, the client should receive HTTP 429.
- Candidate: The system should keep logs so traffic patterns, problematic IPs, and retrospective analysis can be performed later.
- Candidate: The system should support configurable rules and algorithms, such as token bucket, fixed window, and sliding window.

## Scale

- Candidate: For a website like Twitter, we need to handle very high request volume and traffic spikes.
- Candidate: The rate limiter middleware has to sit before the API or web servers and make decisions quickly on every incoming request.
- Candidate: The cache has to support very high throughput because every request may read or write counters.
- Candidate: In a distributed environment with multiple data centers, we need to avoid rate limiting per data center accidentally. We need shared state, or a shared cache strategy, so rate limiting applies globally.

## Design

- Candidate: At a high level, the rate limiter consists of a few components. As we said at the start, we will have a server-side implementation of the rate limiter.
- Candidate: One reason we want to do this server-side is that on the client side, someone with malicious intent could forge or bypass the rate limiter if every client had its own implementation.
- Candidate: Before the request gets processed by our API servers or web servers, there is a rate limiter middleware.
- Candidate: The next component is some kind of rule engine. This is where we define the algorithm we want to use and the rules we want to use, whether it is IP, user ID, geography, or whatever criteria we want to rate limit on.
- Candidate: The other part is a cache with very high throughput. As requests come in, we need to write into the cache which IP is getting what request. Then we can read from the cache to see whether this IP has already consumed requests or not, and block if needed.
- Candidate: In parallel, we can have a logging service that logs all of this information for future analysis.
- Interviewer: Okay, that sounds like a good start.
- Candidate: Let me draw some of the components out to make it easier to visualize.
- Candidate: We start with clients. Then we have our API rate limiter. On top of that, we have a rules engine, which the rate limiter is going to use. Then we have API or web servers.
- Candidate: Think of the API middleware almost like an if-else statement. If this is a success, the request goes to our API servers. If it fails, the request comes back to the user. If we are blocking, we send a 429 HTTP code.
- Candidate: On success, the server responds back, and eventually the middleware goes back to the client, so the client gets a 200 response.
- Candidate: As I mentioned, another thing we need here is a high-throughput cache. The reason for this cache is that the API rate limiter needs to see whether a particular user, if we are blocking based on IP, has already consumed their requests within the given counter.
- Interviewer: I think you mentioned before that it is a 429 HTTP code. I just want to make sure you mean the same thing here.
- Candidate: Sorry, yeah, 429.
- Candidate: From here, we could have some kind of logging mechanism. From there, think of it as putting data into long-term storage, where the data can be analyzed and processed however we want.
- Candidate: Another optimization I am thinking about is with the rules engine. Every time a request comes to the API rate limiter, it needs to check with the rule engine whether the rules have changed or are the same. You could potentially build a cache in the middle.
- Candidate: We have a rules cache, where instead of calling the rules engine, the rate limiter first reads from the cache and then directly uses that for faster read access. The rules engine can directly write into the cache.
- Candidate: At a high level, this would be your API rate limiter.
- Candidate: Just to mention the requirements again: it is server-side, we can block based on IP, user ID, etc., HTTP request handling, and logging.
- Interviewer: Okay. How would you modify this for a distributed environment?
- Candidate: That is a very good question. This system right now is based on a single data center environment, where all requests come in through the same rate limiter and go to the same set of web servers.
- Candidate: In big systems, we do have a distributed environment with more than one data center. What would change is that obviously we would have some kind of load balancer.
- Candidate: The load balancer manages requests across multiple servers and multiple data centers. Then over here we essentially have multiple implementations of the rate limiter, where every data center has its own implementation of this middleware.
- Candidate: What remains constant, or needs to scale horizontally, is the cache. You need one common cache across a distributed network. If you have different caches, then you are rate limiting per data center versus rate limiting across the globe.
- Candidate: You would need one shared cache across all data centers. You could look at different configurations, such as one read cache and one write cache and how to sync between the two, or one common read-write cache shared across all data centers.
- Interviewer: Will all your implementations of the API rate limiter also read from the same cache, the rules cache?
- Candidate: Yes. You could technically have multiple instances of the rules cache if needed. In theory, the rules do not change that often. You would not want to change a rule very often or multiple times in a day. Rules are generally set and persist over a period of time, so they do not need to be distributed in the same way. They can be in a few places, and the rate limiters can read from there.
- Interviewer: Is there a situation in which you would want to have different rate limiters for different geographies?
- Candidate: I do not think so. The reason is that if you end up doing that, you could put yourself in a vulnerable position. If people were able to mimic where their request is coming from, they could bypass the rate limiting logic.
- Candidate: If people start using a VPN or something, they could mask where they are coming from. You would want to have a consistent set of rules across the world so that it is easier to manage and throttle users.
- Interviewer: Yeah, I will just set my VPN to some country that does not use Twitter at all.
- Candidate: Yeah, exactly. For example, if there is a different set of rules for the US versus Asia versus Europe, people could try to circumvent that in a number of ways.

## Follow-up questions

- Interviewer: Let's say you put yourself in the shoes of the user for a second. Let's say you have been rate limited, and maybe you do not have any malicious intent. What strategies are you, as a user, going to use to circumvent that?
- Candidate: Sure. That is a very good question. I think there are a few things you could do as a user that do not have malicious intent.
- Candidate: First, once you are integrating with some of these API clients, let's say something like Stripe where you want to integrate with payment APIs, you would want to know what their rate limiting criteria are and what your traffic patterns are.
- Candidate: If your traffic patterns are exceeding their baseline rate limits, they will definitely have plans to upgrade you. You want to make sure you are in the right tier for the vendor you are using.
- Candidate: The other thing you could do is, let's say your system is suddenly getting a whole bunch of traffic. You should handle those errors gracefully yourself.
- Candidate: When you get a 429 response from the server, you should handle that and show an appropriate error to the client saying to try again after some time. You could also build retry mechanisms within your system to try after a few seconds to see if the request goes through.
- Candidate: These are a few things you could do as a user to prevent yourself from getting blocked.

## Interview analysis

- Interviewer: Okay, I think this is a good place for us to stop. Thank you so much, Josefa. Any thoughts that you have post-interview?
- Candidate: No specific thoughts. I think, again, rate limiter or any kind of system design interview is a very open-ended question. There are a number of ways to solve this problem.
- Candidate: A lot of big companies, like I mentioned, Stripe, Amazon, Twitter, Facebook, all have very different implementations of how they address this problem.
- Candidate: The idea in the system design interview is just to think through what some of the requirements are and what the constraints are. It does not need to be the exact solution that any of these companies use. They would have taken months and years to come up with that. You do not expect a candidate to do that in 35 or 45 minutes to an hour, working by themselves.
- Interviewer: What you are telling me is that I am not supposed to design Facebook's entire system in one 45-minute interview? That is ridiculous. No hire.
- Interviewer: Okay, thank you so much. I am sure this is going to be very valuable, and it was great having you with us again.
- Candidate: Yeah, thank you.
- Interviewer: Thanks so much for watching. Do not forget to hit the like and subscribe buttons below to let us know this video is valuable for you. Check out hundreds more videos just like this at tryexponent.com. Thanks for watching, and good luck on your upcoming interview.
