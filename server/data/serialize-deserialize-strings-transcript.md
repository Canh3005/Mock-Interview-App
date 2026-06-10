# Serialize and Deserialize a List of Strings Transcript

## Introduction

- Interviewer: The question that we will be going through today is: we would like to write a pair of functions to serialize and deserialize a list of strings.
- Interviewer: Hey everyone, I am really excited to be here today doing a software engineering mock interview with Daniel Griffin. Daniel, could you tell us a little bit about yourself?
- Candidate: Yeah, absolutely. I am Daniel. I used to work in the search ads world on small businesses, moved over to more general small businesses, and from there went over to Waymo to work on the self-driving car simulation side.
- Candidate: Lately, I have been finding myself at MainStreet, heading engineering to make sure that small businesses get the government incentives that they deserve.
- Interviewer: Awesome. Thank you so much for joining us today. We are really excited to have you.

## Question

- Interviewer: We will be doing a mock coding interview, and the question that we will be going through today is: we would like to write a pair of functions to serialize and deserialize a list of strings.
- Interviewer: A use case could be that we have a client and a server, and we want to send an array of strings from one to the other, but we are not able to use a standard library or encoding like JSON.

## Clarifying questions

- Candidate: Gotcha. Are there any restrictions around these strings? Is there a set character set for these strings, or can any character be in that?
- Interviewer: Yeah, that is a great question. Let's assume it could be any kind of string, any kind of character. It could be words or it could be something else. In terms of length, let's assume it could be pretty long, like 64,000 characters.
- Candidate: Gotcha, cool.

## Answer

- Candidate: That knocks out the simplest solution I could think of, which is you just join on semicolons or some special character and then split, because what if one of those sub-words or strings has that character? So let's avoid that solution.
- Candidate: That also means we do not have to do any escaping.
- Candidate: The other way I can imagine doing it is that you encode the length of the string and the string for each of the strings in this list, and then you can go back the other way.
- Candidate: The cheapest way I could think of doing it is, say you have the word `cat`, or let's go through this example: if I have `cat` and `jump`, you could encode `3cat4jump`. Then you have `3`, so you know that is the end of your number, then you have `cat`, then `4`, then `jump`.
- Candidate: The nice thing about that is it is really human-readable, so it is easy to debug or see what is happening on the wire.
- Candidate: The downside is, as you said, strings could be 64,000 characters long. I am not going to type out a 64,000-character string, but you can imagine that. Then it is not particularly space-efficient for a number. A number should not have to take that many characters.
- Candidate: The other way I could imagine it is that you could do, I will use `x` in place of my character, `xcatxjump`, where `x` is the number encoded as a 16-byte character that represents the number.
- Candidate: I think I will probably lean that way, because then it is as space-efficient as possible, and I am comfortable that we will be able to write stuff that we can debug along the way.
- Candidate: Cool. If there are no other points, I can jump right in. Do you have any other questions around my encoding scheme?
- Interviewer: I think that makes sense to me. We can jump into it.

## Requirements

- Candidate: The input is a list of strings.
- Candidate: The output of serialize is one string that can be sent over the wire.
- Candidate: The deserialize function should reconstruct the original list of strings.
- Candidate: Strings can contain any character, so delimiter-only approaches are unsafe.
- Candidate: Strings can be long, around 64,000 characters, so the length encoding should be efficient.
- Candidate: We should avoid relying on JSON or a standard encoding library.

## Scale

- Candidate: Since strings can be long and serialization/deserialization can happen often, we should avoid repeatedly concatenating immutable Python strings.
- Candidate: The design should be linear in the size of the encoded data.
- Candidate: We should consider edge cases such as empty input arrays, malformed serialized strings, and strings near the maximum length limit.

## Design

- Candidate: Awesome. I will leave my serialized functions for the moment. I am going to do `encode_number`. Let's say we have some number `m`. We want to do something quick.
- Candidate: In Python, we can raise if the number is too big. Let's make sure we catch it if we are trying to encode a number that is too large, so we do not accidentally have errors and we know that they happen.
- Candidate: We can write the other side of this, which is `decode_number`, and take a string, and return the decoded value.
- Candidate: The next thing we can do to check this is try `10`, `100`, and `0x...`. I am sorry to talk through what I am doing, but I want to take a smattering of numbers and make sure that if I take a number, encode it, and then decode it, it is the same number.
- Candidate: I am running through three arbitrary numbers and making sure they match. If I save, true, true, awesome. I print hello world a lot as well, so I can get rid of that.
- Candidate: For 10, 100, and 4095, they all match. If I take the number, encode it, and decode it, they all match. I am going to take that as my lightweight interview version of a unit test and say this is going to work for us.
- Candidate: Let's jump into the serialize function. The nice thing about this methodology is serialize is going to be nice and easy.
- Candidate: We are going to start with our return array. Our end goal here is that we need an argument, which is our list of strings, and we are going to return one string.
- Candidate: The reason I am starting with an array is that in Python, whenever you try to construct strings one update at a time, every time you update a string it is O(n). We do not want to keep concatenating to this string.
- Candidate: We will push these things out to an array and join and return at the end to be as efficient as possible. Serializing and deserializing are things you do often, so we want to make sure they are efficient and not eating too much time.
- Candidate: We are going to say, for each word in the list, append the encoded length and then append the word itself.
- Candidate: That is our easy return for the serialize function. For every word, first you put in the encoded length of the word, and then you put in the word itself. That is where you get something like `3cat4jump64000...` followed by whatever string that happens to be.
- Candidate: That makes deserialize a little bit more interesting. We are going to take in some string, and this time we want to return an array.
- Candidate: We start at the first part of the string, so index zero. If the length of the string is less than two, we can just return early. The reason is that it takes one character to encode the length, and you are not going to encode a length of zero. If it is less than two, there is nothing encoded and nothing stored, so we can return early and avoid iteration.
- Candidate: Then we go over the course of the whole string piece by piece. First, we get the length by decoding the number at the current index. That character is the encoding of the length.
- Candidate: We can also say, if the length plus the current index is greater than or equal to the length of the string, then something has gone awry. If your encoding says there are three characters but there are only two left, maybe in production you would have a way of reconciling that. For this quick implementation, let's throw an error and move on.
- Candidate: The word is simple. We skip the number encoding by moving to `i + 1`, and then the word is in the string from `i` to `i + length`.
- Candidate: We push that onto the return array. Then we increment `i` by the word length, so we are at the end of that word. Either we should be right at the end of the array, or we should have the next number right there.
- Candidate: Then all we have to do is return the return array.
- Candidate: In theory, that should work. That is always the question. Let's see what happens if we serialize and then deserialize `cat`, `dog`, `jumped`.
- Candidate: Moment of truth: `cat`, `dog`, `jumped`. We can successfully serialize and deserialize, and the strings match.
- Candidate: If I were building this for a production system, I would write more tests. I would have examples closer to or right at the character length limit, and I would make sure more edge cases were covered.
- Candidate: What happens if I pass in the empty array? What happens if I pass bad serializations to deserialize? We should throw errors when we expect them and not return garbage. We should catch that instead of walking past it.
- Candidate: For extensibility, if we wanted to start accepting longer words because, for some reason, we started finding larger and larger books that we are shoving into arrays, we could change `encode_number` and `decode_number` to do some shifting around and support larger numbers.
- Candidate: Then all we would have to do is update the `decode_number` side to account for how many characters we want to pass in. That would be the only part of serialize and deserialize that has to change. Otherwise, the rest should keep working.

## Follow-up questions

- Interviewer: Awesome, great. I think this is a good place to stop the interview. I think we have come to a really good solution, and you went through extensions and improvements we could make.
- Interviewer: Before I give any feedback, do you have any thoughts or reactions to how that went, or anything you would like to add?
- Candidate: As is definitely common in interviews, there are parts of the time where you focus purely on implementing, and it is hard to step aside and make sure you are walking the interviewer through what is going on in your head. Making sure to do that is really important.
- Candidate: Other than that, I am really happy with the implementation itself. The pseudo unit tests in this environment make sure that we can cover it and be confident that it is working as expected.

## Interview analysis

- Interviewer: Yeah, awesome. I would agree with that. I actually think you did a great job of stepping back at certain times and making sure you were explaining not only your approach to the problem, but also little things like optimizing Python code that were informing the way you were writing your code. I thought that was awesome.
- Interviewer: You are obviously a pro, and you really understood how to approach the problem quickly and knew how to solve it.
- Interviewer: Do you have any recommendations for people who maybe see a problem like this and do not immediately see a solution, or maybe have not done something like this before?
- Candidate: Absolutely. The biggest thing in an interview is to recognize that things are a two-way street.
- Candidate: Like we were talking about at the beginning, trying to push around what is the character set, what is the length, and what are the requirements, you should work with your interviewer. This is not just a pure quiz.
- Candidate: One of the biggest positive indicators I have seen when interviewing people is that they pause to talk through the problem with me before just jumping in. They clarify aspects of it, or if there are points of uncertainty, in this case whether it is better to have it be human-readable or not, they pause and talk through it with the interviewer.
- Candidate: What is the use case here? Why am I doing this? That is a great way to get unstuck. Poke at it with your interviewer.
- Interviewer: Totally. Awesome. Thank you so much for taking the time to do this. Do you have any last words you would like to add?
- Candidate: Absolutely. As I said earlier, I am working on MainStreet. We are really trying to make sure that small businesses can thrive and survive as much as possible. We are also hiring engineers.
- Candidate: If you watch this and feel like you want to get your toes wet in real-world engineering and interviewing, we would love to have you. You can check us out at workonmainstreet.com, and you can email us at jobs@workonmainstreet.com. We can set you up so you can try this out for your actual work.
- Interviewer: Awesome. Thank you so much, Daniel, and thanks everyone for joining. Please check out Exponent as well, and good luck on your upcoming interview.
