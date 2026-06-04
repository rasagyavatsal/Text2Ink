from #106-#110 implement github issues one by one. only one issue will be implemented in each iteration. run `gh issue list` and choose the first issue no. which is not closed.

these steps to be followed in each iteration:

1. Run `gh issue view {{issue_number}}` to understand the issue.
3. use TDD skill.
4. Implement the changes without making any plan. directly implement it from issue body.
6. Commit your changes:
   - Stage all changes: `git add -A`
   - Commit: `git commit -m "<brief description> (resolves #{{issue_number}})"`
7. close the issue.

when issue #110 is closed, output exactly: <promise>task_complete</promise>. Do not output the promise after any other issue closing.