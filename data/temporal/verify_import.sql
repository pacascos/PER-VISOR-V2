\copy (SELECT COUNT(*) as total_questions FROM questions) TO STDOUT
\copy (SELECT COUNT(*) as total_options FROM answer_options) TO STDOUT
