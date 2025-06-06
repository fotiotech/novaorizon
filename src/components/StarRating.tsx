import React from "react";
import StarIcon from '@mui/icons-material/Star';
import StarHalfIcon from '@mui/icons-material/StarHalf';
import StarBorderIcon from '@mui/icons-material/StarBorder';

interface StarRatingProps {
  rating: number; // average rating between 0 and 5
  maxStars?: number;
  ratingCount?: number; // total number of ratings
}

const StarRating: React.FC<StarRatingProps> = ({ rating, maxStars = 5, ratingCount }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = maxStars - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 text-sm">
        {[...Array(fullStars)].map((_, i) => (
          <StarIcon key={`full-${i}`} style={{ color: '#FFD700', fontSize: 16 }} />
        ))}
        {hasHalfStar && <StarHalfIcon style={{ color: '#FFD700' }} />}
        {[...Array(emptyStars)].map((_, i) => (
          <StarBorderIcon key={`empty-${i}`} style={{ color: '#FFD700', fontSize: 16 }} />
        ))}
      </div>
      <span className="text-sm text-gray-700">{rating.toFixed(1)}{ratingCount !== undefined ? ` (${ratingCount})` : ''}</span>
    </div>
  );
};

export default StarRating;
