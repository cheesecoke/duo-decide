# Duo Decide

![social-preview-dark](https://github.com/user-attachments/assets/9697a7da-10aa-4661-bb76-b5bc0dd611f0)

**Duo Decide is the app where a couple decides things together, makes them happen, and shares out the work of running a life.**

Dinner tonight, the next trip, which couch, whose family for the holidays. Every couple has a running pile of open questions, and most of them stall in a text thread. Duo gives those questions one shared place, a fair way to settle each one, and a plan for what comes after.

## Product

### Who it's for

Two partners who plan differently. One likes to settle things early; the other would rather see how the day goes. Duo gives the planner a clear process and a deadline, and gives the free-flowing partner a quick, low-pressure way to weigh in. Neither has to chase the other.

### The core loop

1. **Ask.** Either partner puts a decision in the shared queue, with options, an optional deadline and any links.
2. **Decide.** Both weigh in. Duo guarantees an answer: a disagreement can't run forever.
3. **Plan.** The decision becomes a shared plan: who does what, by when, and with which links, dates and bookings. _(Next feature.)_
4. **Remember.** The outcome lands in History, with who decided and how often you agree.

Alongside the loop sits the standing work that nobody decides fresh each week: trash, dinners, the car. **Cards** is where a couple shares that out and keeps count of who is doing it.

A feature that doesn't help a couple decide something, carry it out, or share the load fairly belongs in a different app.

### How a decision gets made

There are two modes.

**Vote** is for quick calls. One partner proposes the options and the other picks. That single pick decides it.

**Poll** is for choices that deserve both voices. It runs for up to three rounds:

| Round | Who votes                         | What happens                                            |
| ----- | --------------------------------- | ------------------------------------------------------- |
| 1     | Both, privately, on every option  | Same pick: decided. Different picks: those two move on. |
| 2     | Both, privately, on the final two | Same pick: decided. Different picks: go to round 3.     |
| 3     | Only the partner who didn't ask   | Their pick decides it.                                  |

Votes stay hidden until both partners have voted in a round, so neither pick sways the other. The person who raised the question never gets the last word, which keeps it fair and makes sure it ends.

The full rules are in [documents/ROUND_LOGIC.md](documents/ROUND_LOGIC.md).

### What's in the app today

- **Decision queue**: the shared list of open decisions. Each card shows whose move it is.
- **Vote and Poll**: the two ways to decide, described above.
- **Option lists**: reusable sets of options, such as dinner spots or date ideas, to drop into a new decision.
- **Cards**: a deck of responsibility cards, one per job (trash, groceries, date nights). Each card is held by one partner. Either of you can mark a card done for the day, the other sees it, and the tab shows how many jobs each of you has done in the last seven days. Start from the starter deck or write your own cards.
- **History**: every decided decision with its winner, plus who decides more often and your streak. Decisions can be archived or moved back to the queue.
- **Two colours, one couple**: each partner picks a colour, and the whole app shows who asked, who voted and what you decided together.
- **Partner invite**: invite your partner by email. They are linked to you when they sign up.
- **Live sync**: a vote on one phone shows on the other without a refresh.
- **Account**: email sign-in, password reset, and account deletion from inside the app.

### What's next

- **Plan**: turn a decision into something that happens. Steps with an owner (you, your partner, together), links and resources, dates on the calendar, and a day-by-day itinerary for trips.
- **Nudges**: a notification when it's your move, a reminder before a deadline, and a way to tap your partner on the shoulder about a decision that's waiting on them.
- **Connection**: small moments that come out of deciding together, such as looking back on what you chose a year ago.

### What Duo is not

- **Not a relationship journal.** Day counters, memory timelines and daily questions are a different product. Duo starts where those stop: at the point a couple has to choose something and follow through.
- **Not a general task manager.** Cards are standing responsibilities with one owner each, and plans exist because a decision was made. There are no one-off to-dos, projects or due-date lists.
- **Not for groups.** Every rule in the app assumes exactly two people. That is why a decision can always be settled.

### Principles

1. **Every decision ends.** No flow may leave a couple stuck.
2. **Fair to both.** Private votes, and the last word goes to the partner who didn't ask.
3. **Small decisions stay small.** Choosing dinner should take seconds. Depth is there for the trip, not forced on the takeout.
4. **Both planning styles are welcome.** Deadlines and structure for one partner; one-tap answers for the other.
5. **Private by default.** A couple's data is visible to those two people only. No ads and no analytics.

## Development

Duo Decide is built with React Native and Expo, with Supabase for auth, data and realtime. It uses Expo Router, NativeWind, React Hook Form, Zod and TypeScript. iOS is the launch platform; the same code runs on the web.

Start with [CLAUDE.md](CLAUDE.md): it holds the conventions every change follows.

- [Application overview](docs/application-overview.md)
- [Project configuration](docs/project-configuration.md)
- [Project structure](docs/project-structure.md)
- [Components and styling](docs/components-and-styling.md)
- [State management](docs/state-management.md)
- [Supabase setup](docs/supabase-setup.md)
- [Releasing](documents/RELEASING.md)

```bash
npm install
npm start          # Expo dev server
npm run typecheck
npm test           # Jest
npm run test:sql   # migration tests
```

## License

MIT. See [LICENSE](LICENSE).
