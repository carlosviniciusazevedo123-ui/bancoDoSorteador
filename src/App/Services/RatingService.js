
const attributes = [
    "attack",
    "defense",
    "passing",
    "finishing",
    "speed",
    "decision_making"
];

export default async function updateRating(player, attribute, evaluation) {
    let current;
    if (player[attribute] === null) {
        current = player.overall_rating
    } else {
        current = player[attribute]
    }

    const difference = evaluation - current;

    const adjustment = difference * 0.20;

    const newRating = adjustment + current

    const numberRating = Number(newRating.toFixed(1))

    player[attribute] = numberRating

    let sum = 0;

    let count = 0;

    for (const item of attributes) {

        if (player[item] !== null) {
            sum = sum + player[item];
            count = count + 1;
        }
    }
    if (count > 0) {
        const average = sum / count
        player.overall_rating = Number(average.toFixed(1))
    }
    await player.update({
    overall_rating: player.overall_rating,
    [attribute]: numberRating
})

}
