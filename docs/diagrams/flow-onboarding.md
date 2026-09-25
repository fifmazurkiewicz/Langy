# Langy — business flow: learner onboarding

```mermaid
flowchart TD
    start([Learner signs in]) --> language[Choose language to learn]
    language --> profile[Set level, goal and learning preferences]
    profile --> placement{Placement check needed?}
    placement -- Yes --> interview[Complete short assessment conversation]
    interview --> level[Set initial proficiency estimate]
    placement -- No --> level
    level --> save[Save learner profile]
    save --> end([Ready to start a lesson])
```
