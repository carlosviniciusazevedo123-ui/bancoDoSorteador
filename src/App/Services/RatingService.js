
export default async function updateRating(
    player,
    averages,
    evaluationWeight,
    transaction) {

    const currentRating = Number(player.overall_rating);

    let sum = 0;
    let count = 0;

    for (const attribute of Object.values(averages)) {

        if (attribute !== null) {
            sum += Number(attribute);
            count++;
        }
    }

    if (count === 0) {
        return;
    }

    const evaluationAverage = Number((sum / count).toFixed(1));

    const currentWeight = 1 - evaluationWeight;

    const newRating =
        currentRating * currentWeight +
        evaluationAverage * evaluationWeight;

    const numberRating = Number(newRating.toFixed(1));

    await player.update({
        overall_rating: numberRating
    }, transaction ? { transaction } : undefined);
}
