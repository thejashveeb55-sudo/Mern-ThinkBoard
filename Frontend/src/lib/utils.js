 //to diplay time and date in a more readable format
export function formatDate(date){
  return date.toLocaleDateString("en-US",{
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}