# Langy — business flow: Quizlet export

```mermaid
flowchart TD
    start([Learner chooses vocabulary to export]) --> select[Select approved flashcards]
    select --> format[Format front/back pairs for Quizlet]
    format --> file[Create plain-text export]
    file --> deliver[Offer copy or download]
    deliver --> end([Learner imports set into Quizlet])
```
