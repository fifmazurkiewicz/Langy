# Langy — business flow: spaced-repetition review

```mermaid
flowchart TD
    start([Learner opens due flashcards]) --> card[Show prompt, audio or example]
    card --> recall[Reveal answer after recall attempt]
    recall --> rating[Rate recall quality]
    rating --> schedule[FSRS calculates next review]
    schedule --> save[Persist review history and due date]
    save --> more{More due cards?}
    more -- Yes --> card
    more -- No --> end([Review session complete])
```
